<div align="center">
  <img src="https://res.cloudinary.com/dgqgzmzed/image/upload/v1758799239/pngtree-camping-logo-design-vector-png-image_5284762_iedxjj.jpg" alt="SpotSync Logo" width="160" />

  <h1>SpotSync</h1>
  <p><strong>Discover · Review · Camp — with AI-powered confidence.</strong></p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
  ![Tests](https://img.shields.io/badge/Tests-24%2F24%20passing-brightgreen?logo=jest)
  ![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)
  ![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-yellow)
</div>

---

## What is SpotSync?

SpotSync is a **production-grade, full-stack camping-spot platform** built entirely in **TypeScript** on a clean **MVC architecture**. Campers can discover spots on an interactive 3D map, upload photos, write star-rated reviews, and trust that every image has been screened in real-time by **Google Gemini Vision AI** before it ever hits the database.

> Built to demonstrate: AI integration, secure REST design, PWA best-practices, Redis caching, and solid DevOps — in a single cohesive product.

---

## ✨ Feature Highlights

### 🤖 Gemini AI Image Moderation Pipeline
Every uploaded photo is **base64-encoded and sent to Google Gemini 1.5 Flash Vision** _before_ it is persisted. The pipeline:
- Runs moderation concurrently on all uploaded images (`Promise.allSettled`)
- Rejects the entire upload if **any** image fails the safety check
- Catches and surfaces a user-friendly flash message — no server crash, no leaked data
- Applies on **both** campground creation **and** edit (fixes the critical pre-moderation bug)
- Falls open (allows upload) only when Gemini itself is unreachable — a safe degradation strategy

```
User Upload
    │
    ▼
Multer (memory storage, 10 MB/file, 5 files max)
    │
    ▼
Cloudinary (temporary upload — get secure_url + public_id)
    │
    ▼
Gemini 1.5 Flash Vision ──► REJECT ──► delete from Cloudinary + flash error
    │
  SAFE
    │
    ▼
MongoDB (save campground with image URLs)
```

### 🗺️ Interactive 3D Cluster Map
- **MapTiler SDK** renders a WebGL 3D terrain map with hillshading
- Campground pins auto-cluster at low zoom and expand on click
- Each individual spot page shows a **satellite-view detail map** pinpointing the exact location
- Map data sourced from OpenStreetMap + MapTiler Cloud

### 📸 Multi-Image Cloud Upload
- **Multer** handles multipart form data with `memoryStorage` (never writes to disk)
- Up to **5 images**, **10 MB each**, streamed to Cloudinary
- Campground edit page allows selective image deletion (cleans up Cloudinary too — no orphans)

### ⭐ Review & Rating System
- Star ratings (1–5) with written reviews
- Only the review author can delete their own review
- Reviews are embedded in the campground document (MongoDB subdocument pattern)

### 🔐 Authentication & Authorisation
- **Passport.js** with `passport-local-mongoose` strategy
- Passwords hashed with **bcrypt** (cost factor managed by PLM)
- Session-based auth with secure, httpOnly, sameSite cookies
- Route guards (`isLoggedIn`, `isAuthor`) enforce ownership at every mutation

### 🛡️ Security-First Design
| Layer | Implementation |
|---|---|
| CSRF protection | `csrf-csrf` double-submit cookie pattern |
| Security headers | `helmet` with tight Content-Security-Policy |
| Rate limiting | `@upstash/ratelimit` (sliding window) on login, register, and create |
| NoSQL injection | `express-mongo-sanitize` strips `$` / `.` from input |
| Secure session | `connect-mongo` store, `sameSite: strict`, `httpOnly: true` |
| Input validation | `joi` schemas validated server-side before any DB write |

### ⚡ Redis Caching
- **Upstash Redis** (serverless, zero-cost cold-start tier) caches:
  - The full campground index (60-second TTL)
  - Individual campground detail pages
- Cache invalidated automatically on create / update / delete

### 📱 Progressive Web App (PWA)
- **Service Worker** (`client-sw/sw.ts`) provides offline cache-first strategy for static assets
- `manifest.json` with app name, theme colour, and all icon sizes
- Custom install-prompt UI — user is invited to add SpotSync to their home screen
- Works on **iOS Safari, Android Chrome, and desktop Chrome/Edge**

### 🐳 Docker Multi-Stage Build
- `Dockerfile` uses a multi-stage build: `builder` compiles TS → `production` copies `dist/` only
- Final image is slim — no dev dependencies, no source files
- `docker-compose.yml` wires the app to a local MongoDB instance for local dev

### ✅ Automated Test Suite
- **Jest** + **Supertest** — 24 tests across 4 suites
- Unit tests for Gemini moderation service and campground/user controllers
- Integration tests for campground routes (auth flow, CRUD, image upload)
- Run with `npm test` — deterministic, no network calls (mocked)

### 🔁 CI/CD Pipeline
- **Jenkinsfile** defines a declarative pipeline: Install → Lint → Test → Build → (Deploy)
- Easily adapted to GitHub Actions or GitLab CI

---

## 🏗️ MVC Architecture

```
SpotSync/
├── src/                         ← Backend (TypeScript, compiled to dist/)
│   ├── app.ts                   ← Express app factory (middleware, sessions, passport)
│   ├── server.ts                ← HTTP server entry point
│   │
│   ├── controllers/             ← CONTROLLER — business logic, request/response
│   │   ├── campgrounds.ts       ← CRUD + AI moderation + Cloudinary management
│   │   └── users.ts             ← Register, login, logout
│   │
│   ├── models/                  ← MODEL — Mongoose schemas & data shape
│   │   ├── campground.ts        ← Campground schema (images, reviews, author, geo)
│   │   ├── review.ts            ← Review subdocument schema
│   │   └── user.ts              ← User schema (passport-local-mongoose plugin)
│   │
│   ├── routes/                  ← Express routers (thin — delegate to controllers)
│   │   ├── campgrounds.ts
│   │   ├── reviews.ts
│   │   └── users.ts
│   │
│   ├── services/
│   │   └── geminiModeration.ts  ← Google Gemini Vision AI integration
│   │
│   ├── middleware/              ← Auth guards, flash helpers, CSRF, upload
│   ├── schemas/                 ← Joi validation schemas
│   └── utils/                  ← Cloudinary config, Redis client
│
├── views/                       ← VIEW — EJS templates + Bootstrap 5
│   ├── layouts/
│   │   └── boilerplate.ejs      ← Base HTML shell (head, nav, footer, flash)
│   ├── partials/
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   ├── campgrounds/             ← index, show, new, edit pages
│   └── users/                   ← login, register pages
│
├── client/                      ← Browser TypeScript (compiled to public/javascripts/)
│   ├── mapIndex.ts              ← Cluster map initialisation
│   ├── mapShow.ts               ← Satellite detail map
│   ├── starRating.ts            ← Interactive star input
│   └── pwa.ts                   ← Service Worker registration + install prompt
│
├── client-sw/
│   └── sw.ts                    ← Service Worker (cache-first, compiled to public/sw.js)
│
├── public/                      ← Static assets
│   ├── manifest.json            ← PWA manifest
│   └── stylesheets/
│
└── src/__tests__/               ← Jest test suites
    ├── controllers/
    ├── routes/
    └── services/
```

**Data flows:**

```
Browser ──HTTP──► Express Router ──► Controller ──► Model (Mongoose) ──► MongoDB Atlas
                                         │
                                         ├──► geminiModeration.ts ──► Google Gemini API
                                         ├──► Cloudinary SDK
                                         └──► Upstash Redis (cache)

Browser ◄──EJS render── Controller ◄── Model response
```

---

## 🤖 How AI Is Used

SpotSync uses **Google Gemini 1.5 Flash Vision** (`gemini-1.5-flash`) as a content moderation layer. Here's the full technical flow:

1. **Upload trigger** — user submits the campground form with 1–5 images
2. **Multer** buffers images in memory (never written to disk)
3. **Cloudinary upload** — images are uploaded and get a `public_id` + `secure_url`
4. **Moderation** — `geminiModeration.ts` takes each image's buffer, base64-encodes it, and sends it to Gemini as an **inline `inlineData` part** (not a URL) for maximum privacy
5. **Gemini's response** is parsed for safety signals. If any image is flagged as unsafe, inappropriate, or entirely unrelated to camping/outdoors:
   - All images are deleted from Cloudinary (`destroyImages()` via `Promise.allSettled`)
   - A descriptive flash error is shown to the user
   - **Nothing is written to MongoDB**
6. **On success** — image URLs + public IDs are saved to the campground document

The moderation runs **before any DB write** in both `createCampground` and `updateCampground`, closing the critical race condition that existed in the legacy code.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 5 (100% — zero hand-written JS) |
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Templating | EJS + EJS-Mate layouts |
| CSS | Bootstrap 5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Passport.js + passport-local-mongoose (bcrypt) |
| AI Moderation | Google Gemini 1.5 Flash Vision API |
| Image CDN | Cloudinary (Multer memory storage) |
| Maps | MapTiler SDK (WebGL, 3D terrain) |
| Cache | Upstash Redis (`@upstash/ratelimit`) |
| Session store | connect-mongo |
| Security | helmet, csrf-csrf, express-mongo-sanitize |
| Validation | Joi |
| PWA | Service Worker API + Web App Manifest |
| Testing | Jest + Supertest (24 tests) |
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
# MongoDB
DATABASE_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/spotsync

# Session
SESSION_SECRET=your_super_secret_32_char_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# MapTiler
MAPTILER_API_KEY=your_maptiler_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# App
PORT=3000
NODE_ENV=development
```

### 3. Development

```bash
npm run dev          # ts-node-dev hot-reload server
npm run build:client # compile client TS → public/
```

### 4. Production build

```bash
npm run build        # compiles src/ → dist/
node dist/server.js
```

### 5. Run tests

```bash
npm test             # Jest — 24 tests, 4 suites
```

### 6. Docker

```bash
docker compose up --build   # app + MongoDB
```

---

## ☁️ Deploying to Oracle Cloud Always Free (Step-by-Step)

Oracle Always Free gives you a **permanently free ARM VM (4 OCPUs, 24 GB RAM)** — no cold starts, no sleep, unlike Render's free tier.

### Step 1 — Create an Oracle Cloud Account

1. Go to [cloud.oracle.com](https://cloud.oracle.com) → **Start for Free**
2. Complete sign-up (credit card required for identity verification — you will **not** be charged on Always Free resources)
3. Choose your **home region** (pick the closest one — you can't change it later)

### Step 2 — Create the VM

1. In the Oracle Console → **Compute → Instances → Create Instance**
2. **Name:** `spotsync-prod`
3. **Image:** Ubuntu 22.04 (Canonical)
4. **Shape:** `VM.Standard.A1.Flex` (Ampere ARM — up to 4 OCPUs / 24 GB RAM on Always Free)
   - Set **OCPUs: 1**, **Memory: 6 GB** (stays within free limits)
5. **Networking:** Default VCN is fine. Ensure **Assign a public IPv4 address** is checked
6. **SSH keys:** Upload your public key (`~/.ssh/id_rsa.pub`) or let Oracle generate a key pair
7. Click **Create** — VM boots in ~2 minutes

### Step 3 — Open Port 3000 (and 80/443 for Nginx)

**A) Oracle VCN Security List:**
1. Console → **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default**
2. **Add Ingress Rule:**
   - Source CIDR: `0.0.0.0/0`
   - Protocol: TCP
   - Destination Port: `3000` (add another rule for `80` and `443` if using Nginx)

**B) Ubuntu firewall (inside the VM):**
```bash
sudo iptables -I INPUT 6 -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Step 4 — SSH In & Install Node.js + PM2

```bash
# SSH in (replace with your VM's public IP)
ssh ubuntu@<YOUR_ORACLE_PUBLIC_IP>

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # v22.x.x
npm -v

# Install PM2 globally (process manager — keeps app alive on crash/reboot)
sudo npm install -g pm2
```

### Step 5 — Clone, Configure & Build

```bash
# Clone your repo
git clone https://github.com/mayankcodes-dev/spotsync.git
cd spotsync

# Install dependencies
npm install

# Create .env (fill in all values from your Quick Start .env above)
nano .env

# Set NODE_ENV to production
echo "NODE_ENV=production" >> .env

# Compile TypeScript
npm run build

# Compile client-side TypeScript
npm run build:client
```

### Step 6 — Start with PM2

```bash
# Start the app
pm2 start dist/server.js --name spotsync

# Configure PM2 to restart on server reboot
pm2 startup
# ↑ Run the command PM2 prints (it's a sudo command)
pm2 save

# Check it's running
pm2 status
pm2 logs spotsync
```

Your app is now running at `http://<YOUR_ORACLE_PUBLIC_IP>:3000` 🎉

### Step 7 — Nginx Reverse Proxy (Port 80)

Serve on port 80 without running Node as root:

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/spotsync
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com;   # or your public IP

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/spotsync /etc/nginx/sites-enabled/
sudo nginx -t          # verify config
sudo systemctl reload nginx
```

### Step 8 — Free HTTPS with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Replace with your actual domain (must point to your Oracle IP via DNS)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically via systemd timer
sudo certbot renew --dry-run   # verify renewal works
```

### Step 9 — Updating the App

```bash
cd ~/spotsync
git pull origin main
npm install
npm run build
npm run build:client
pm2 restart spotsync
```

### Why Oracle over Render (Free Tier)?

| | Oracle Always Free | Render Free |
|---|---|---|
| Cold starts | ❌ None — always on | ✅ ~30–60 sec delay after inactivity |
| RAM | Up to 24 GB (Ampere ARM) | 512 MB |
| Persistent disk | 200 GB block storage | Ephemeral |
| Custom domain + SSL | ✅ Free (Certbot) | ✅ Free |
| Expiry | Never | Never |
| Root access | ✅ Full VM | ❌ Sandboxed |

---

## 🤝 Contributing

```bash
# All source files must be TypeScript — no .js files in src/ or client/
# Lint must pass:
npm run lint

# Tests must stay green:
npm test   # must show 24 passed, 24 total

# Use conventional commits:
git commit -m "feat: add campground search by location"
git commit -m "fix: handle Cloudinary timeout in moderation pipeline"
```

---

## 📄 License

MIT © [Mayank](https://github.com/mayankcodes-dev)
