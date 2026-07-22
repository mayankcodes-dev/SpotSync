# SpotSync – Task Tracker

## Completed

### Migration & Rebrand
- [x] Renamed project from YelpCamp → SpotSync across all files
- [x] Migrated `app.js` → `src/app.ts` (TypeScript)
- [x] Migrated all controllers to `src/controllers/*.ts`
- [x] Migrated all routes to `src/routes/*.ts`
- [x] Migrated all models to `src/models/*.ts`
- [x] Migrated middleware to `src/middleware.ts`
- [x] Migrated cloudinary config to `src/cloudinary/index.ts`
- [x] Migrated schemas to `src/schemas.ts`
- [x] Migrated utilities to `src/utils/*.ts`
- [x] Created `tsconfig.json`
- [x] Created `jest.config.ts`
- [x] Updated `package.json` with all new scripts and deps

### Features
- [x] Groq AI image moderation (`llama-3.2-11b-vision-preview`)
- [x] Upstash Redis caching (campgrounds list + detail, 5-min TTL)
- [x] Upstash rate limiting (10/min auth, 5/min campground create)
- [x] MapTiler 3D terrain maps (SATELLITE show page, OUTDOOR cluster map)
- [x] PWA Web App Manifest (`public/manifest.json`)
- [x] PWA Service Worker (`public/sw.js`) — cache-first static, network-first HTML
- [x] PWA install button in navbar (auto-show via `beforeinstallprompt`)
- [x] PWA icons (72–512px SVG)
- [x] Views rebranded (navbar, footer, boilerplate title)
- [x] Cloudinary folder renamed YelpCamp → SpotSync

### Testing
- [x] Jest configured with ts-jest
- [x] Unit tests: `groqModeration.test.ts`
- [x] Unit tests: `campgrounds.test.ts` (controller)
- [x] Unit tests: `users.test.ts` (controller)
- [x] Integration tests: `campgrounds.integration.test.ts` (supertest)

### DevOps
- [x] Jenkinsfile (8-stage pipeline)
- [x] Dockerfile (existing)
- [x] `.ai/PROJECT.md`, `.ai/AGENTS.md`, `.ai/TASKS.md`, `.ai/SESSION.md`

## Currently Working
- [ ] Build verification + GitHub push

## Next Priority
- [ ] Add `.env.example` with all variable names (no values)
- [ ] Verify TypeScript compiles cleanly
- [ ] Verify tests pass
- [ ] Push to GitHub: `https://github.com/mayankcodes-dev/SpotSync`
- [ ] Create `docs/decisions.md` for architectural decision log

## Known Bugs
- None found at time of refactor; original `createCampground` had a reference to `id` without declaration in one branch (fixed in TS port)
- `models/campground.js` referenced `cloudinary` without importing it (fixed in TS version)

## Technical Debt
- `@types/mongoose` was deprecated (Mongoose ships own types) — removed from deps
- Redis `setex` serializes as JSON string; `getCached` should JSON.parse — handled in service

## Refactoring Opportunities
- Extract geocoding logic into its own `src/services/geocoding.ts` service
- Add request logging middleware (morgan)
- Improve error pages with proper HTTP status responses
- Add Zod for runtime validation in place of Joi (typed schemas)

## Nice To Have
- Google/GitHub OAuth via passport-google-oauth20
- Docker Compose for local dev (MongoDB + Redis + App)
- Email verification on register (nodemailer)
- Cloudinary image optimization (lazy load, WebP conversion)
- Full-text search for campgrounds
- Admin dashboard

## Blockers
- None
