# SpotSync

## One Line Description
A full-stack campground discovery and review platform built with Node.js, TypeScript, EJS, MongoDB, and modern cloud services.

## Business Goal
Allow users to discover, share, and review campgrounds globally. Features interactive 3D maps, AI image moderation, and a Progressive Web App experience.

## Tech Stack

### Frontend
- EJS (Embedded JavaScript templates with ejs-mate layouts)
- Bootstrap 5.3 (responsive UI)
- Bootstrap Icons
- Vanilla CSS (custom `app.css`, `stars.css`)
- MapTiler SDK v2 (interactive 3D maps with terrain)
- PWA (Service Worker + Web App Manifest)

### Backend
- Node.js + TypeScript (`src/` directory compiles to `dist/`)
- Express 5
- Passport.js (local strategy)
- Multer (file uploads)
- Helmet (CSP security)
- Method-override (PUT/DELETE via forms)

### Database
- MongoDB Atlas (via Mongoose 8)
- Connect-mongo (session store)

### Authentication
- Passport-local + passport-local-mongoose
- express-session with MongoDB session store

### Storage
- Cloudinary (image upload + deletion)
- Upstash Redis (caching + rate limiting via @upstash/redis, @upstash/ratelimit)

### AI
- Groq SDK (`llama-3.2-11b-vision-preview`) for image content moderation

### Testing
- Jest + ts-jest
- Supertest (HTTP integration tests)

### Deployment
- Dockerfile (included)
- Jenkinsfile (CI/CD pipeline)
- Compatible with PM2, Docker, or any Node host

### Package Manager
- npm

## Folder Structure
```
SpotSync/
├── src/                          # TypeScript source (compiles to dist/)
│   ├── app.ts                    # Express entry point
│   ├── schemas.ts                # Joi validation schemas
│   ├── middleware.ts             # Auth, validation, author-check middleware
│   ├── cloudinary/
│   │   └── index.ts              # Cloudinary config + multer storage
│   ├── controllers/
│   │   ├── campgrounds.ts        # Campground CRUD + Groq moderation + Redis cache
│   │   ├── reviews.ts            # Review CRUD
│   │   └── users.ts              # Auth (register/login/logout)
│   ├── middleware/
│   │   └── rateLimit.ts          # Upstash rate limiting middleware
│   ├── models/
│   │   ├── campground.ts         # Campground Mongoose model
│   │   ├── review.ts             # Review Mongoose model
│   │   └── user.ts               # User Mongoose model (passport-local-mongoose)
│   ├── routes/
│   │   ├── campgrounds.ts        # Campground routes
│   │   ├── reviews.ts            # Review routes
│   │   └── users.ts              # Auth routes
│   ├── services/
│   │   ├── groqModeration.ts     # Groq AI image moderation service
│   │   └── redis.ts              # Upstash Redis client + cache helpers
│   ├── types/
│   │   └── express.d.ts          # Express type augmentations
│   └── __tests__/
│       ├── controllers/
│       │   ├── campgrounds.test.ts
│       │   └── users.test.ts
│       ├── routes/
│       │   └── campgrounds.integration.test.ts
│       └── services/
│           └── groqModeration.test.ts
├── views/                        # EJS templates (served from project root)
│   ├── layouts/boilerplate.ejs
│   ├── partials/
│   ├── campgrounds/
│   └── users/
├── public/                       # Static assets
│   ├── javascripts/
│   │   ├── clusterMap.js         # 3D cluster map (OUTDOOR + terrain)
│   │   ├── showPageMap.js        # 3D show-page map (SATELLITE + terrain)
│   │   ├── validateForms.js
│   │   └── pwa.js                # PWA install script
│   ├── stylesheets/
│   ├── manifest.json             # PWA Web App Manifest
│   ├── sw.js                     # Service Worker
│   └── icons/                    # PWA icons (72–512px)
├── dist/                         # TypeScript compiled output (gitignored)
├── scripts/
│   └── generateIcons.js          # PWA icon generator
├── seeds/                        # DB seed scripts
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Template for env vars
├── tsconfig.json                 # TypeScript config
├── jest.config.ts                # Jest config (ts-jest)
├── Jenkinsfile                   # CI/CD pipeline
├── Dockerfile                    # Container definition
└── package.json
```

## Core Features
- **User Auth**: Register, login, logout (passport-local)
- **Campground CRUD**: Create, read, update, delete campgrounds with image upload
- **Groq AI Moderation**: Images scanned on upload; unsafe/irrelevant images rejected
- **Redis Caching**: Campground list & detail cached in Upstash Redis (5-min TTL)
- **Rate Limiting**: 10 req/min on auth routes; 5 req/min on campground creation
- **3D Maps**: MapTiler SATELLITE (show page, pitch 65°, bearing -30°) and OUTDOOR (index cluster map)
- **Reviews**: Star ratings + text reviews per campground
- **PWA**: Install to home screen, offline caching, service worker
- **CSP Security**: Strict Helmet Content-Security-Policy headers

## Current Progress

### Completed
- Full TypeScript migration (src/ → dist/)
- SpotSync rebrand (all YelpCamp references replaced)
- Groq AI image moderation (llama-3.2-11b-vision-preview)
- Upstash Redis caching (campgrounds list + detail)
- Upstash Ratelimit (sliding window, IP-based)
- MapTiler 3D terrain maps (SATELLITE + OUTDOOR)
- PWA (manifest.json, sw.js, install button)
- Jest tests (unit + integration, ts-jest)
- Jenkinsfile CI/CD pipeline

### In Progress
- N/A

### Pending
- Docker Compose for local dev stack
- Push notifications (SW placeholder ready)
- OAuth (Google/GitHub) login

## API Structure
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Home page |
| GET | `/campgrounds` | No | List all campgrounds |
| POST | `/campgrounds` | Yes | Create campground (rate limited) |
| GET | `/campgrounds/new` | Yes | New campground form |
| GET | `/campgrounds/:id` | No | Show campground |
| PUT | `/campgrounds/:id` | Yes (author) | Update campground |
| DELETE | `/campgrounds/:id` | Yes (author) | Delete campground |
| GET | `/campgrounds/:id/edit` | Yes (author) | Edit form |
| POST | `/campgrounds/:id/reviews` | Yes | Create review |
| DELETE | `/campgrounds/:id/reviews/:reviewID` | Yes (author) | Delete review |
| GET | `/register` | No | Register form |
| POST | `/register` | No | Register user (rate limited) |
| GET | `/login` | No | Login form |
| POST | `/login` | No | Login user (rate limited) |
| GET | `/logout` | Yes | Logout |

## Environment Variables
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
CLOUDINARY_URL=
NODE_ENV=development
MAPTILER_API_KEY=
DB_URL=mongodb+srv://...
SECRET=
PORT=3000
GROQ_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Coding Standards
- TypeScript strict mode disabled for compatibility; interfaces used throughout
- Async errors wrapped with `catchAsync()` utility
- Joi validation on all form inputs with XSS sanitization
- Redis operations fail open (errors logged, request proceeds)
- Groq moderation fails open (API errors do not block uploads)
- All controllers export named functions (no `module.exports` pattern)

## Architecture Overview
```
Browser → Express (src/app.ts)
         ├── Helmet CSP
         ├── express-session (MongoDB store)
         ├── Passport.js (auth)
         ├── Routes → Middleware → Controllers
         │           ├── Rate Limit (Upstash)
         │           ├── isLoggedIn / isAuthor
         │           └── Joi Validation
         ├── Controllers
         │   ├── Redis cache check/set
         │   ├── Groq moderation (on upload)
         │   ├── Mongoose DB queries
         │   └── MapTiler geocoding
         └── EJS templates (views/)
```

## Important Notes
- Views and public/ are served from the **project root**, not `dist/`. The app resolves paths using `path.join(__dirname, '..')`.
- The Cloudinary folder changed from `YelpCamp` to `SpotSync` — old images still work via their absolute URLs.
- Redis is optional: if `UPSTASH_*` env vars are missing, caching/rate-limiting fail silently.
