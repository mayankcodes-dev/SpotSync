# 🏕️ SpotSync

**SpotSync** is a full-stack camping spot discovery and review platform — find, share, and explore amazing camping spots worldwide.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?logo=bootstrap)](https://getbootstrap.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?logo=googlechrome)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

---

## 📱 Install the App

SpotSync is a **Progressive Web App** — install it directly on your device for a native app experience, no app store needed.

| Platform | How to Install |
|----------|---------------|
| 🖥️ **Chrome / Edge (Desktop)** | Click the **Download App** button in the navbar |
| 📱 **Android (Chrome)** | Click the **Download App** button → tap Install |
| 🍎 **iPhone / iPad (Safari)** | Tap **Share** → **Add to Home Screen** |
| 🤖 **Android (Firefox)** | Tap **⋮ menu** → **Install** |

> The app works **offline** once installed — your recent spots are cached automatically.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗺️ **3D Terrain Maps** | <a href="https://www.maptiler.com/" target="_blank">MapTiler SDK</a> with satellite imagery, 65° pitch, terrain exaggeration |
| 🤖 **AI Image Moderation** | <a href="https://aistudio.google.com/" target="_blank">Google Gemini 1.5 Flash</a> validates every uploaded image |
| ⚡ **Redis Caching** | <a href="https://upstash.com/" target="_blank">Upstash Redis</a> caches spot lists & details (5-min TTL) |
| 🛡️ **Rate Limiting** | IP-based sliding window limits on auth & spot creation |
| 📱 **Progressive Web App** | Installable, offline-capable, service worker, home screen icon |
| 🔐 **Auth** | Passport.js local strategy with secure session management |
| ☁️ **Cloud Storage** | <a href="https://cloudinary.com/" target="_blank">Cloudinary</a> for image upload, optimization & deletion |
| 🧪 **Tests** | Jest + ts-jest unit tests & Supertest integration tests |
| 🔄 **CI/CD** | Jenkins declarative pipeline (install → test → build → deploy) |

---

## 🛠️ Tech Stack

**Backend:** <a href="https://nodejs.org/" target="_blank">Node.js</a> · <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> · <a href="https://expressjs.com/" target="_blank">Express 5</a> · <a href="https://mongoosejs.com/" target="_blank">Mongoose 8</a>  
**Frontend:** EJS + ejs-mate · <a href="https://getbootstrap.com/" target="_blank">Bootstrap 5.3</a> · Bootstrap Icons  
**Database:** <a href="https://www.mongodb.com/" target="_blank">MongoDB Atlas</a>  
**Cache / Rate Limit:** <a href="https://upstash.com/" target="_blank">Upstash Redis</a>  
**AI:** <a href="https://aistudio.google.com/" target="_blank">Google Gemini 1.5 Flash</a> (vision moderation)  
**Maps:** <a href="https://www.maptiler.com/" target="_blank">MapTiler SDK v2</a> (3D terrain, satellite, cluster)  
**Auth:** Passport.js · express-session · connect-mongo  
**Storage:** <a href="https://cloudinary.com/" target="_blank">Cloudinary</a>  
**Security:** Helmet (CSP) · express-mongo-sanitize · Joi + sanitize-html  
**Testing:** <a href="https://jestjs.io/" target="_blank">Jest</a> · ts-jest · <a href="https://github.com/ladjs/supertest" target="_blank">Supertest</a>  

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- <a href="https://www.mongodb.com/cloud/atlas" target="_blank">MongoDB Atlas</a> account (or local MongoDB)
- <a href="https://cloudinary.com/" target="_blank">Cloudinary</a> account
- <a href="https://www.maptiler.com/" target="_blank">MapTiler</a> account
- <a href="https://aistudio.google.com/" target="_blank">Google AI Studio</a> API key (free)
- <a href="https://upstash.com/" target="_blank">Upstash</a> account (free tier works)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/mayankcodes-dev/SpotSync.git
cd SpotSync

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# → Edit .env with your credentials

# 4. Run in development mode
npm run dev
```

### Build for Production

```bash
# Compile TypeScript
npm run build

# Start production server
npm start
```

### Run Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage
```

---

## 📁 Project Structure

```
SpotSync/
├── src/                    # TypeScript source → compiles to dist/
│   ├── app.ts              # Express entry point
│   ├── controllers/        # Route handlers (campgrounds, users, reviews)
│   ├── routes/             # Express routers
│   ├── models/             # Mongoose models
│   ├── middleware/         # Rate limiting
│   ├── middleware.ts       # Auth, validation, authorization
│   ├── services/
│   │   ├── groqModeration.ts   # 🤖 Gemini AI image safety check
│   │   └── redis.ts            # ⚡ Cache + rate limit helpers
│   ├── cloudinary/         # Cloudinary config + Multer storage
│   ├── schemas.ts          # Joi validation schemas
│   ├── utils/              # ExpressError, catchAsync, mongoSanitize
│   ├── types/              # TypeScript type declarations
│   └── __tests__/          # Jest tests (unit + integration)
├── views/                  # EJS templates
│   ├── layouts/            # ejs-mate boilerplate layout
│   ├── partials/           # navbar, footer, flash
│   ├── campgrounds/        # index, show, new, edit
│   └── users/              # login, register
├── public/                 # Static assets
│   ├── javascripts/
│   │   ├── clusterMap.js   # 3D OUTDOOR cluster map
│   │   ├── showPageMap.js  # 3D SATELLITE show-page map
│   │   └── pwa.js          # PWA install button logic
│   ├── stylesheets/        # Custom CSS
│   ├── icons/              # PWA icons (72–512px, valid PNG)
│   ├── manifest.json       # 📱 PWA Web App Manifest
│   └── sw.js               # 🔧 Service Worker
├── tsconfig.json           # TypeScript config
├── jest.config.ts          # Jest + ts-jest config
├── Jenkinsfile             # CI/CD pipeline
└── .env.example            # Environment variable template
```

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# MongoDB
DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/spotsync

# Session
SECRET=your-long-random-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# MapTiler (maps)
MAPTILER_API_KEY=your_maptiler_key

# Google AI Studio (image moderation)
GEMINI_API_KEY=your_google_ai_studio_api_key

# Upstash Redis (caching + rate limiting)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

PORT=3000
NODE_ENV=development
```

---

## 🤖 Gemini AI Image Moderation

Every image uploaded to a spot is automatically scanned by <a href="https://aistudio.google.com/" target="_blank">Google Gemini 1.5 Flash</a> before being saved:

```typescript
// src/services/groqModeration.ts
const result = await moderateImage(imageUrl);
// returns: { isSafe: boolean, reason: string }
```

- ✅ **Safe & relevant** → Image saved, spot created
- ❌ **Unsafe or irrelevant** → Image deleted from Cloudinary, flash error shown
- ⚠️ **API unavailable** → Fails open (image accepted, no blocking)

---

## ⚡ Redis Caching & Rate Limiting

**Caching** (<a href="https://upstash.com/" target="_blank">Upstash Redis</a>, 5-minute TTL):
- `GET /spots` → cached as `spotsync:campgrounds:all`
- `GET /spots/:id` → cached as `spotsync:campground:{id}`
- Cache invalidated on create / update / delete

**Rate Limiting** (sliding window):
- Auth routes (`/login`, `/register`) → 10 requests/minute per IP
- Spot creation → 5 requests/minute per IP
- Exceeds limit → flash error + redirect

---

## 🗺️ 3D Maps

### Show Page (per spot)
- **Style:** `SATELLITE` (aerial imagery)
- **Pitch:** 65° (dramatic tilt)
- **Bearing:** -30° (rotated)
- **Terrain:** raster-DEM with 1.5× exaggeration
- **Controls:** NavigationControl + TerrainControl

### Index Page (all spots)
- **Style:** `OUTDOOR` (topographic)
- **Clustering:** Color-coded cluster circles
- **Terrain:** 1.2× exaggeration
- **Controls:** NavigationControl + pitch indicator

---

## 📱 Progressive Web App

SpotSync is fully installable as a native app:

1. Open the site in **Chrome** or **Edge**
2. Click **"Download App"** in the navbar
3. Accept the install prompt
4. Launch SpotSync from your home screen or taskbar

**Service Worker Strategy:**
- Static assets (CSS/JS/fonts) → **Cache-First**
- HTML pages → **Network-First** with offline fallback
- Form submissions (POST/PUT/DELETE) → **Network only**

---

## 🧪 Testing

```bash
npm test                   # Run all tests
npm run test:coverage      # With coverage report
```

Test coverage includes:
- `groqModeration.test.ts` — Unit tests for Gemini moderation service
- `campgrounds.test.ts` — Unit tests for spot controller
- `users.test.ts` — Unit tests for auth controller
- `campgrounds.integration.test.ts` — HTTP integration tests via Supertest

All external services (Gemini, Redis, Cloudinary, MongoDB) are mocked in tests.

---

## 🔄 CI/CD (Jenkins)

The `Jenkinsfile` defines an 8-stage pipeline:

| Stage | Action |
|-------|--------|
| Checkout | `git checkout` |
| Setup Node | Verify Node version |
| Install | `npm ci` |
| Type Check | `npm run lint` (tsc --noEmit) |
| Test | `npm test` (Jest) |
| Build | `npm run build` (tsc) |
| Copy Assets | Copy `views/` and `public/` to `dist/` |
| Archive | Create `.tar.gz` build artifact |
| Deploy (main) | Configurable: PM2 / Docker |

---

## 🔒 Security

- **Helmet CSP** — strict Content-Security-Policy headers
- **express-mongo-sanitize** — prevents NoSQL injection
- **Joi + sanitize-html** — input validation + XSS prevention
- **Session** — httpOnly cookie, 7-day expiry, MongoDB store
- **Passport** — hashed passwords via passport-local-mongoose
- **Rate limiting** — prevents brute force on auth endpoints

---

## 🐳 Docker

```bash
# Build image
docker build -t spotsync .

# Run container
docker run -p 3000:3000 --env-file .env spotsync
```

---

## 📝 License

ISC © <a href="https://mayank-developer.vercel.app/" target="_blank">Mayank Singh</a>
