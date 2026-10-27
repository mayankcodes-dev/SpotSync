<div align="center">
  <img src="https://res.cloudinary.com/dgqgzmzed/image/upload/v1758799239/pngtree-camping-logo-design-vector-png-image_5284762_iedxjj.jpg" alt="SpotSync Logo" width="160" />

  <h1>SpotSync</h1>
  <p><strong>Discover · Review · Camp — with AI-powered confidence.</strong></p>
</div>

---

## What is SpotSync?

SpotSync is a **production-grade, full-stack camping-spot platform** built entirely in **TypeScript** following a strict **MVC architecture**. Campers discover spots on an interactive 3D terrain map, upload photos that are screened in real-time by **Google Gemini Vision AI**, and leave star-rated reviews — all backed by a secure, Redis-cached Express backend.

---

## ✨ Features

### 🤖 AI-Powered Image Moderation (Core Feature)
Every photo a user uploads is automatically analyzed by **Google Gemini 1.5 Flash Vision** before a single byte is saved to the database. This is not a bolt-on — it is the primary trust layer of the platform:

- Images are **base64-encoded inline** (never sent as a URL — maximum privacy)
- Moderation runs concurrently on all files via `Promise.allSettled`
- If **any** image is flagged as unsafe, off-topic, or inappropriate:
  - All uploads are deleted from Cloudinary immediately
  - A clear flash error is shown to the user
  - **Nothing reaches MongoDB** — the DB write never happens
- Covers both **create** and **edit** flows
- Degrades safely when Gemini is unreachable (fails open, logs the error)

```
User Uploads Photos
        │
        ▼
  Multer (memory — never touches disk)
        │
        ▼
  Cloudinary (temporary upload → gets public_id + secure_url)
        │
        ▼
  Gemini 1.5 Flash Vision (base64 inline analysis)
        │
   ┌────┴────┐
 UNSAFE     SAFE
   │          │
   ▼          ▼
Delete     Save to MongoDB
Cloudinary  (campground created/updated)
+ Flash Error
```

### 🗺️ Interactive 3D Cluster Map
- **MapTiler SDK** renders a WebGL 3D terrain map with hillshading and elevation
- Campground markers auto-cluster at low zoom, expand on click
- Individual spot pages render a **satellite-view detail map** with a precise location pin
- Map data from OpenStreetMap + MapTiler Cloud

### 📸 Multi-Image Cloud Upload
- **Multer** with `memoryStorage` — no temp files on disk
- Up to **5 images, 10 MB each**, streamed to Cloudinary
- Edit page lets authors delete specific images — Cloudinary copies cleaned up too (no orphaned files)

### ⭐ Review & Rating System
- 1–5 star ratings with written reviews
- Only the review's author can delete it
- Reviews stored as MongoDB subdocuments inside the campground document

### 🔐 Secure Authentication
- **Passport.js** with `passport-local-mongoose` (bcrypt under the hood)
- Session-based auth with `connect-mongo` session store
- Secure, httpOnly, sameSite cookies
- Route-level guards (`isLoggedIn`, `isAuthor`) enforce ownership on every mutation

### 🛡️ Defence-in-Depth Security Stack
| Layer | Tool |
|---|---|
| CSRF | `csrf-csrf` — double-submit cookie pattern |
| Security headers | `helmet` with strict Content-Security-Policy |
| Rate limiting | `@upstash/ratelimit` — sliding window on login, register, create |
| NoSQL injection | `express-mongo-sanitize` — strips `$` / `.` from all input |
| Input validation | `joi` — server-side schema validation before any DB write |

### ⚡ Redis Caching
- **Upstash Redis** (serverless, HTTP-based) caches the campground index and individual detail pages
- Cache is invalidated automatically on create, update, and delete

### 📱 Progressive Web App (PWA)
- Service Worker (`client-sw/sw.ts`) — cache-first strategy for static assets, works offline
- `manifest.json` with theme colour, display mode, and icon
- Custom install-prompt UI invites users to add SpotSync to their home screen
- Works on iOS Safari, Android Chrome, and desktop Chrome / Edge

### 🐳 Docker Multi-Stage Build
- `Dockerfile`: `builder` stage compiles TypeScript → `production` stage copies `dist/` only
- Final image has zero dev dependencies and zero source files
- `docker-compose.yml` wires app + local MongoDB for one-command local dev

### ✅ Automated Test Suite
- **Jest** + **Supertest** — 24 tests across 4 suites
- Unit tests for the Gemini moderation service and controllers
- Integration tests for campground routes (auth, CRUD, image upload)
- All network calls mocked — deterministic, no flakiness

---

## 🏗️ MVC Architecture

```
SpotSync/
├── src/                         ← Server-side TypeScript (compiled → dist/)
│   ├── app.ts                   ← Express app factory (middleware, sessions, passport)
│   ├── server.ts                ← HTTP server entry point
│   │
│   ├── controllers/             ── CONTROLLER: request handling & business logic
│   │   ├── campgrounds.ts       ← CRUD + AI moderation + Cloudinary management
│   │   └── users.ts             ← Register, login, logout
│   │
│   ├── models/                  ── MODEL: Mongoose schemas & data shape
│   │   ├── campground.ts        ← Campground (images[], reviews[], author, geo)
│   │   ├── review.ts            ← Review subdocument
│   │   └── user.ts              ← User (passport-local-mongoose plugin)
│   │
│   ├── routes/                  ← Thin Express routers — delegate to controllers
│   │   ├── campgrounds.ts
│   │   ├── reviews.ts
│   │   └── users.ts
│   │
│   ├── services/
│   │   └── geminiModeration.ts  ← Google Gemini Vision API integration
│   │
│   ├── middleware/              ← Auth guards, flash helpers, CSRF, upload config
│   ├── schemas/                 ← Joi validation schemas
│   └── utils/                  ← Cloudinary config, Redis client
│
├── views/                       ── VIEW: EJS templates + Bootstrap 5
│   ├── layouts/boilerplate.ejs  ← Base HTML shell (head, nav, footer, flash)
│   ├── partials/                ← Reusable navbar, footer
│   ├── campgrounds/             ← index, show, new, edit pages
│   └── users/                  ← login, register pages
│
├── client/                      ← Browser TypeScript (compiled → public/javascripts/)
│   ├── mapIndex.ts              ← Cluster map initialisation
│   ├── mapShow.ts               ← Satellite detail map
│   ├── starRating.ts            ← Interactive star input
│   └── pwa.ts                  ← Service Worker registration + install prompt
│
├── client-sw/
│   └── sw.ts                    ← Service Worker (cache-first, compiled → public/sw.js)
│
└── src/__tests__/               ← Jest test suites
    ├── controllers/
    ├── routes/
    └── services/
```

**Request flow:**

```
Browser ──HTTP──► Router ──► Controller ──► Model (Mongoose) ──► MongoDB Atlas
                                 │
                                 ├──► geminiModeration.ts ──► Google Gemini API
                                 ├──► Cloudinary SDK
                                 └──► Upstash Redis (read cache / invalidate)

Browser ◄──EJS render── Controller ◄── Model response
```

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 5 — 100%, zero hand-written JS |
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Templating | EJS + ejs-mate layouts |
| CSS | Bootstrap 5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Passport.js + passport-local-mongoose (bcrypt) |
| AI Moderation | Google Gemini 1.5 Flash Vision API |
| Image CDN | Cloudinary (Multer memory storage) |
| Maps | MapTiler SDK (WebGL 3D terrain) |
| Caching | Upstash Redis (`@upstash/ratelimit`) |
| Session store | connect-mongo |
| Security | helmet, csrf-csrf, express-mongo-sanitize, joi |
| PWA | Service Worker + Web App Manifest |
| Testing | Jest + Supertest (24 tests / 4 suites) |
| Containers | Docker multi-stage + docker-compose |
| CI/CD | Jenkinsfile (declarative pipeline) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 22
- MongoDB Atlas URI (or local MongoDB)
- Cloudinary account
- MapTiler API key
- Google AI Studio API key (Gemini)
- Upstash Redis REST URL + token

### 1. Clone & install

```bash
git clone https://github.com/mayankcodes-dev/spotsync.git
cd spotsync
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```env
DATABASE_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/spotsync
SESSION_SECRET=your_super_secret_32_char_string

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

MAPTILER_API_KEY=your_maptiler_key
GEMINI_API_KEY=your_gemini_api_key

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

PORT=3000
NODE_ENV=development
```

### 3. Development

```bash
npm run dev          # ts-node-dev hot-reload server
npm run build:client # compile client TS → public/javascripts/
```

### 4. Production build

```bash
npm run build        # compiles src/ → dist/
node dist/server.js
```

### 5. Tests

```bash
npm test             # Jest — 24 tests, 4 suites, all passing
```

### 6. Docker

```bash
docker compose up --build   # app + MongoDB, one command
```

---

## 🤝 Contributing

- All source files must be **TypeScript** — no `.js` in `src/` or `client/`
- Lint must pass: `npm run lint`
- Tests must stay green: `npm test` → 24 passed, 24 total
- Use conventional commits: `feat:`, `fix:`, `chore:` prefixes

---

## 📄 License

MIT © [Mayank](https://github.com/mayankcodes-dev)
