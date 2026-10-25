if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import express, { Request, Response, NextFunction } from 'express';
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

// Use ejs-mate for layouts
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

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
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

app.use(session(sessionConfig));
app.use(flash());

// ─── Security (Helmet CSP) ──────────────────────────────────────────────────
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://api.maptiler.com',
        'https://cdn.jsdelivr.net',
        'https://events.maptiler.com',
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
        '*.maptiler.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.maptiler.com'],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
      manifestSrc: ["'self'"],
    },
  })
);

// ─── Passport Authentication ─────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy((User as any).authenticate()));
passport.serializeUser((User as any).serializeUser());
passport.deserializeUser((User as any).deserializeUser());

// ─── CSRF Protection ─────────────────────────────────────────────────────────
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SECRET || 'spotsync-csrf-secret-changeme',
  getSessionIdentifier: (req: Request) => (req.session as any)?.id || '',
  cookieName: 'psifi.x-csrf-token', // no __Host- prefix so it works on http in dev too
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
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
  // CSRF token invalid/expired
  if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
    req.flash('error', 'Form session expired or invalid. Please try again.');
    return res.redirect('back');
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'Each image must be under 10 MB.');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      req.flash('error', 'You can upload a maximum of 5 images.');
    } else {
      req.flash('error', `Upload error: ${err.message}`);
    }
    return res.redirect('back');
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
  res.status(statusCode).render('error', { err });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 SpotSync running on port ${port}`);
});

export default app;
