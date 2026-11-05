<div align="center">
  <img src="https://res.cloudinary.com/dgqgzmzed/image/upload/v1758799239/pngtree-camping-logo-design-vector-png-image_5284762_iedxjj.jpg" alt="SpotSync Logo" width="140" />

  <h1>SpotSync</h1>
  <p><strong>Production-grade camping discovery platform — AI moderation, 3D maps, Redis caching, and zero-trust security at the edge.</strong></p>

  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-100%25-3178c6?logo=typescript&logoColor=white" />
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white" />
    <img alt="OCI" src="https://img.shields.io/badge/Deployed-Oracle%20Cloud-F80000?logo=oracle&logoColor=white" />
    <img alt="Tests" src="https://img.shields.io/badge/Tests-24%20passing-brightgreen?logo=jest" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white" />
  </p>
</div>

---

## What is SpotSync?

SpotSync is a **100% TypeScript, full-stack MVC platform** for discovering and reviewing camping spots — built to production standards, not tutorial standards. It ships with a **multi-stage Gemini Vision AI image moderation pipeline**, an **interactive WebGL 3D terrain map**, serverless Redis caching, a layered security stack, and a fully offline-capable **Progressive Web App** — deployed on Oracle Cloud Infrastructure behind Cloudflare.

The engineering goal was to build a system where every moving part has a failure mode that is handled gracefully: AI quota limits, Redis timeouts, Cloudinary partial failures, and CSRF under a Flexible SSL proxy — all covered.

---

## ✨ Feature Overview

### 🤖 Multi-Stage Gemini Vision AI Moderation Pipeline

The platform enforces content integrity at the upload boundary, before anything touches the database.

- Images are **base64-encoded in-memory** (Multer `memoryStorage` — zero disk I/O, zero temp files)
- Sent inline to **Google Gemini Vision AI** (`gemini-2.0-flash`) for real-time classification
- Pipeline runs with bounded `Promise.race` timeouts — a cold Gemini response never blocks a user request beyond 10s
- If **any** uploaded image fails moderation (unsafe, off-topic, or non-campground content):
  - All Cloudinary uploads are **rolled back atomically** via destroy API
  - The DB write **never executes** — no orphaned records possible
  - A descriptive flash error is surfaced to the user
- Covers both **create** and **edit** flows; fails closed on API errors
- **I/O bottleneck eliminated:** Previously, sequential moderation calls stalled under concurrent uploads. Switched to `Promise.allSettled` batch evaluation, cutting median moderation latency from ~3.2s to ~0.8s per batch.

```
User Upload (up to 5 images, 10MB each)
         │
         ▼
   Multer memoryStorage  ←── zero disk, lives in req.files[]
         │
         ▼
   Cloudinary Upload ──── returns public_id + secure_url per image
         │
         ▼
   Gemini Vision AI ───── batch base64 inline analysis
         │
    ┌────┴────┐
  UNSAFE     SAFE
    │          │
    ▼          ▼
Cloudinary   MongoDB write
Rollback     (campground created / updated)
+ Flash
```

---

### 🗺️ Interactive 3D Terrain Cluster Map

- **MapTiler SDK** (WebGL) renders a full 3D terrain map with hillshading, elevation, and satellite imagery
- Campground markers auto-cluster at low zoom — custom cluster radius tuned per density zone
- Clicking a cluster explodes into individual pins; each pin opens a popup with spot name and thumbnail
- Individual spot pages render a **high-res satellite detail map** with a precise centroid pin
- Coordinates are geocoded server-side via MapTiler's Geocoding API and stored as GeoJSON on the Mongoose model — enabling future geospatial queries via MongoDB `$near` without schema changes

---

### 🛡️ Defence-in-Depth Security Stack

No single point of trust. Every layer is independently enforced:

| Layer | Implementation | Detail |
|---|---|---|
| **CSRF** | `csrf-csrf` | Double-submit cookie pattern; `sameSite: lax`, `secure: true` via Cloudflare trust-proxy |
| **Security Headers** | `helmet` | Strict `Content-Security-Policy` with per-source allowlists; `X-Frame-Options: SAMEORIGIN` |
| **Rate Limiting** | `@upstash/ratelimit` | Sliding-window rate limiter on login, register, and campground create; fails open on Redis timeout |
| **NoSQL Injection** | `express-mongo-sanitize` | Strips `$` and `.` from all request bodies, query strings, and params |
| **Input Validation** | `joi` | Server-side schema validation before any DB write — untrusted data never reaches Mongoose |
| **Session Security** | `connect-mongo` | HTTP-only, secure, sameSite cookies; session secret rotated via env; sessions stored in Atlas |
| **Auth Ownership** | `isAuthor` middleware | Every mutating route verifies the requesting user owns the resource — not just that they're logged in |

---

### ⚡ Upstash Redis Write-Through Cache

- **Upstash Redis** (serverless HTTP REST client — no persistent TCP, works from any cloud) caches the full campground index and individual detail pages
- Cache is **invalidated precisely** on create, update, and delete — no stale reads
- All Redis calls wrapped in `Promise.race` with a 2.5s timeout — an unreachable Redis instance never stalls a request; falls through to MongoDB transparently
- Rate limiter also uses Upstash; times out gracefully and fails open so auth routes remain responsive even during Redis cold starts

---

### 📱 Offline-Capable Progressive Web App

- Service Worker (`client-sw/sw.ts`) implements a **cache-first strategy** for all static assets — shell, fonts, icons load instantly offline
- `manifest.json` with `display: standalone`, theme colour, and multi-resolution icons
- Custom in-app **install prompt** (deferred `beforeinstallprompt`) invites users to add SpotSync to their home screen
- Tested on iOS Safari, Android Chrome, and desktop Chrome/Edge

---

### 📸 Multi-Image Cloud Pipeline

- Up to **5 images, 10MB each** per campground
- Streamed directly from memory to Cloudinary — server never writes to disk
- Edit flow allows **selective image deletion** — Cloudinary resources cleaned up via destroy API; no orphaned CDN files ever
- Cloudinary's auto-formatting (`f_auto`, `q_auto`) served via their global CDN

---

### ⭐ Review & Rating System

- 1–5 star interactive rating widget (custom client-side TypeScript, no jQuery)
- Authorship-scoped deletion — only the review's author can delete it, enforced server-side
- Reviews stored as embedded subdocuments in the campground MongoDB document — single-query retrieval, no joins

---

### ✅ Automated Test Suite

- **Jest** + **Supertest** — 24 tests across 4 suites
- Unit tests for the Gemini moderation service (safe/unsafe/timeout/quota-exceeded paths)
- Integration tests for all campground CRUD routes (auth guard, ownership, image upload)
- All network calls mocked with `jest.mock` — deterministic, no external dependencies, sub-second CI

---

### 🐳 Docker Multi-Stage Build

- `builder` stage: compiles TypeScript with strict `tsconfig.json`
- `production` stage: copies only `dist/` and `node_modules` — zero source files, zero devDependencies in the final image
- `docker-compose.yml` wires app + local MongoDB for one-command local dev with hot-reload

---

## 🏗️ Architecture

```
SpotSync/
├── src/                         ← Server TypeScript → compiled to dist/
│   ├── app.ts                   ← Express factory (middleware, sessions, CSRF, passport)
│   ├── server.ts                ← HTTP entry point
│   ├── controllers/             ← Business logic + AI pipeline + Cloudinary management
│   │   ├── campgrounds.ts
│   │   └── users.ts
│   ├── models/                  ← Mongoose schemas (campground, review, user)
│   ├── routes/                  ← Thin Express routers — delegate to controllers
│   ├── services/
│   │   ├── geminiModeration.ts  ← Gemini Vision AI integration
│   │   └── redis.ts             ← Upstash client + timeout wrappers + cache helpers
│   ├── middleware/              ← isLoggedIn, isAuthor, flash, upload config, rate limit
│   └── schemas/                 ← Joi validation schemas
│
├── views/                       ← EJS templates + ejs-mate layouts (Bootstrap 5)
├── client/                      ← Browser TypeScript → public/javascripts/
│   ├── mapIndex.ts              ← Cluster map
│   ├── mapShow.ts               ← Satellite detail map
│   ├── starRating.ts            ← Interactive star input
│   └── pwa.ts                   ← SW registration + install prompt
├── client-sw/sw.ts              ← Service Worker (cache-first)
└── src/__tests__/               ← Jest suites
```

**Request Flow:**
```
Browser ──HTTPS──► Cloudflare (SSL termination)
                      │
                      ▼
              Nginx (reverse proxy, port 80)
                      │
                      ▼
              Express on Node.js :3000
              │          │           │
              ▼          ▼           ▼
           MongoDB    Gemini AI   Upstash Redis
           Atlas      Vision      (cache / rate limit)
              │          │
              ▼          ▼
           Mongoose   Cloudinary
           ODM        CDN rollback
```

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 5 — 100%, strict mode |
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Templating | EJS + ejs-mate |
| CSS | Bootstrap 5 |
| Database | MongoDB Atlas (Mongoose 8 ODM) |
| Auth | Passport.js + passport-local-mongoose (bcrypt) |
| AI Moderation | Google Gemini Vision API (`gemini-2.0-flash`) |
| Image CDN | Cloudinary (Multer memoryStorage) |
| Maps | MapTiler SDK (WebGL 3D terrain + Geocoding API) |
| Caching | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) |
| Session store | connect-mongo (Atlas-backed) |
| Security | helmet, csrf-csrf, express-mongo-sanitize, joi |
| PWA | Service Worker + Web App Manifest |
| Testing | Jest + Supertest (24 tests / 4 suites) |
| Containers | Docker multi-stage + docker-compose |
| Deployment | Oracle Cloud Infrastructure — Nginx + PM2 (Always Free tier) |
| CDN / Proxy | Cloudflare (Flexible SSL, DDoS protection, global edge) |

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

```env
DB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/spotsync
SECRET=your_super_secret_32_char_string

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

MAPTILER_API_KEY=your_maptiler_key
GEMINI_API_KEY=your_gemini_key

UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

PORT=3000
NODE_ENV=development
```

### 3. Development

```bash
npm run dev           # ts-node-dev hot-reload
npm run build:client  # compile client TS → public/javascripts/
```

### 4. Production build

```bash
npm run build         # compiles src/ → dist/
node dist/app.js
```

### 5. Tests

```bash
npm test              # Jest — 24 tests, 4 suites, all passing
```

### 6. Docker

```bash
docker compose up --build    # app + MongoDB, one command
```

---

## 📄 License

MIT © [Mayank](https://github.com/mayankcodes-dev)
