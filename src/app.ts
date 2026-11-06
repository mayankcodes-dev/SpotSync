import dotenv from 'dotenv';

dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { doubleCsrf } from 'csrf-csrf';
import path from 'path';
import mongoose from 'mongoose';
import session from 'express-session';
import flash from 'connect-flash';
import ExpressError from './utils/ExpressError';
import ejsMate from 'ejs-mate';
import methodOverride from 'method-override';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from './models/user';
import sanitizeV5 from './utils/mongoSanitizeV5';
import helmet from 'helmet';
import MongoDBStore from 'connect-mongo';

import userRoutes from './routes/users';
import campgroundRoutes from './routes/campgrounds';
import reviewRoutes from './routes/reviews';

const requiredProductionEnv = [
  'DB_URL',
  'SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_KEY',
  'CLOUDINARY_SECRET',
  'MAPTILER_API_KEY',
  'GEMINI_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredProductionEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

// ─── Database Connection ────────────────────────────────────────────────────
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/spotsync';
mongoose.connect(dbUrl).catch((err) => console.error('Mongo connection error:', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('✅ Database connected');
});

// ─── App Setup ──────────────────────────────────────────────────────────────
const app = express();

// Always trust the first proxy (Nginx). Required so req.ip is the real client
// IP and so Express sets the correct protocol (https) when behind Cloudflare.
// This must NOT be conditional — the server always sits behind Nginx.
app.set('trust proxy', 1);

// Use ejs-mate for layouts
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
// Disable Express auto-ETag — ETags let browsers cache HTML pages that embed
// CSRF tokens; a cached login/register page carries a stale token → 403.
app.set('etag', false);

// Views and public are at project root, not in dist/
const projectRoot = path.join(__dirname, '..');
app.set('views', path.join(projectRoot, 'views'));
app.set('query parser', 'extended');

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(projectRoot, 'public')));
app.use(sanitizeV5({ replaceWith: '_' }));

// ─── Session Store ──────────────────────────────────────────────────────────
const store = MongoDBStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret: process.env.SECRET || 'spotsync-secret-changeme',
  },
});

store.on('error', function (e: Error) {
  console.log('SESSION STORE ERROR', e);
});

const sessionConfig: session.SessionOptions = {
  store,
  name: 'spotsync.sid',
  secret: process.env.SECRET || 'spotsync-secret-changeme',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Cookies must be secure when served over HTTPS (via Cloudflare).
    // With trust proxy = 1, Express sees req.secure = true when Cloudflare
    // sends the X-Forwarded-Proto: https header, so we can always enable this.
    secure: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

app.use(session(sessionConfig));
app.use(flash());

// ─── Security (Helmet CSP) ──────────────────────────────────────────────────
app.use(
  helmet.contentSecurityPolicy({
    // useDefaults: false prevents Helmet from auto-adding upgrade-insecure-requests
    // which breaks Cloudflare Flexible SSL (CF→origin is HTTP, browser sees HTTPS)
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://api.maptiler.com',
        'https://cdn.jsdelivr.net',
        'https://events.maptiler.com',
        'https://api.mapbox.com',
        'https://*.maptiler.com',
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://cdn.maptiler.com',
        'https://cdn.jsdelivr.net',
        'https://kit.fontawesome.com/',
        'https://cdnjs.cloudflare.com/',
        'https://stackpath.bootstrapcdn.com/',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.maptiler.com',
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://kit-free.fontawesome.com/',
        'https://stackpath.bootstrapcdn.com',
        'https://use.fontawesome.com/',
      ],
      imgSrc: [
        "'self'",
        'blob:',
        'data:',
        'https://res.cloudinary.com',
        'https://images.unsplash.com',
        'https://cdn.maptiler.com',
        'https://api.maptiler.com',
        'https://t3.ftcdn.net',
        'https://*.maptiler.com',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.maptiler.com',
        'https://kit-free.fontawesome.com/',
        'https://use.fontawesome.com/',
        'https://fonts.googleapis.com',
      ],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      // child-src blob: required for MapTiler SDK WebGL workers (spawned as blob: URLs)
      childSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  })
);

app.get('/healthz', (_req: Request, res: Response) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

// ─── Passport Authentication ─────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy((User as any).authenticate()));
passport.serializeUser((User as any).serializeUser());
passport.deserializeUser((User as any).deserializeUser());

// ─── Cookie Parser (required before CSRF middleware) ─────────────────────────
app.use(cookieParser());

// ─── CSRF Protection ─────────────────────────────────────────────────────────
// csrf-csrf v4 reads the token from req.headers['x-csrf-token'] by default.
// Our forms submit the token as req.body._csrf, so we override getCsrfTokenFromRequest
// to check both the body field and the header (supports AJAX too).
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SECRET || 'spotsync-csrf-secret-changeme',
  getSessionIdentifier: (req: Request) => (req.session as any)?.id || '',
  cookieName: 'psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    // secure: false — Cloudflare Flexible SSL: browser↔CF is HTTPS but
    // CF↔origin is plain HTTP. The CSRF cookie is set on the HTTP response
    // from origin; marking it Secure here would prevent it being re-sent by
    // CF to origin over HTTP. Session security is still guaranteed by HTTPS
    // at the Cloudflare edge. The double-submit pattern itself is the CSRF
    // protection — cookie confidentiality isn't required for CSRF tokens.
    secure: false,
    sameSite: 'lax',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Read token from:
  //  1. body._csrf — standard URL-encoded form submissions
  //  2. query._csrf — multipart/form-data forms (body not yet parsed by multer at this point)
  //  3. x-csrf-token header — AJAX / fetch requests
  getCsrfTokenFromRequest: (req: Request) =>
    (req.body?._csrf as string) ||
    (req.query?._csrf as string) ||
    (req.headers['x-csrf-token'] as string) ||
    '',
});
app.use(doubleCsrfProtection);

// ─── Local Variables ─────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.maptilerApiKey = process.env.MAPTILER_API_KEY || '';
  res.locals.csrfToken = () => generateCsrfToken(req, res);
  let mainContentClass = '';
  if (req.path === '/login' || req.path === '/register') {
    mainContentClass = 'main-content--auth';
  }
  res.locals.mainContentClass = mainContentClass;
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/', userRoutes);
app.use('/spots', campgroundRoutes);
app.use('/spots/:id/reviews', reviewRoutes);

app.get('/', (req: Request, res: Response) => {
  res.render('home', { activePage: 'home' });
});

// ─── CSRF + Multer Error Handler ──────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // CSRF token invalid/expired — redirect safely using the Referer header
  // path, or fall back to a sensible default. Never use res.redirect('back')
  // because Express resolves it literally as the string "back" when no
  // Referrer header is present (common with Cloudflare proxy).
  if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
    req.flash('error', 'Form session expired or invalid. Please try again.');
    // Derive a safe redirect from the Referer header; strip the origin so we
    // only keep the path, then validate it starts with '/'.
    let safePath = '/';
    try {
      const referer = req.get('Referer') || '';
      if (referer) {
        const url = new URL(referer);
        safePath = url.pathname || '/';
      }
    } catch {
      // bad Referer — fall back to '/'
    }
    // Never redirect back to itself infinitely on POST routes
    if (req.path === safePath && req.method !== 'GET') {
      safePath = '/';
    }
    return res.redirect(safePath);
  }
  if (err.message === 'Only JPG, PNG, or WebP images are allowed.') {
    req.flash('error', err.message);
    // Safe redirect using referrer
    let safePath = '/spots';
    try {
      const referer = req.get('Referer') || '';
      if (referer) {
        const url = new URL(referer);
        safePath = url.pathname || '/spots';
      }
    } catch { /* ignore */ }
    return res.redirect(safePath);
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'Each image must be under 10 MB.');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      req.flash('error', 'You can upload a maximum of 5 images.');
    } else {
      req.flash('error', `Upload error: ${err.message}`);
    }
    let safePath = '/spots';
    try {
      const referer = req.get('Referer') || '';
      if (referer) {
        const url = new URL(referer);
        safePath = url.pathname || '/spots';
      }
    } catch { /* ignore */ }
    return res.redirect(safePath);
  }
  next(err);
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all(/(.*)/, (req: Request, res: Response, next: NextFunction) => {
  next(new ExpressError('Page Not Found', 404));
});
// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err: ExpressError, req: Request, res: Response, next: NextFunction) => {
  const { statusCode = 500 } = err;
  if (!err.message) {
    err.message = 'Oh No, Something Went Wrong!';
  }
  // Ensure res.locals always has currentUser so navbar never throws
  if (res.locals.currentUser === undefined) {
    res.locals.currentUser = req.user || null;
  }
  res.status(statusCode).render('error', { err });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 SpotSync running on port ${port}`);
});

export default app;
