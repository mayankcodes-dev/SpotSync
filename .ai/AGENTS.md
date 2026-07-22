# SpotSync – AI Agent Operating Manual

> Read this before writing any code.

## Mandatory Pre-Coding Checklist
1. Read `PROJECT.md` — understand the tech stack and architecture.
2. Read `TASKS.md` — know what's done, what's in progress, what's next.
3. Read `SESSION.md` — pick up exactly where the last session ended.
4. Search the codebase before creating any new file.

## Core Principles

### Architecture
- All server logic lives in `src/` as TypeScript. **Never add JS files to `src/`.**
- Views (`views/`) and static files (`public/`) are at the project root — not inside `src/` or `dist/`.
- The compiled output goes to `dist/`. Do not commit `dist/` to git.
- Run `npm run build` to compile. Run `npm run dev` for development (ts-node).

### Code Style
- Use **named exports** in controllers and services (no `module.exports`).
- Wrap all async route handlers with `catchAsync()` from `src/utils/catchAsync.ts`.
- Throw `ExpressError(message, statusCode)` for HTTP-level errors.
- Use the Joi schemas in `src/schemas.ts` for all input validation.
- Never duplicate Joi schemas — extend or import from `schemas.ts`.

### Redis / Caching
- Always fail **open** on Redis errors (log the error, proceed without cache).
- Use `CACHE_KEYS` from `src/services/redis.ts` for consistent key naming.
- Invalidate cache in ALL write operations (create, update, delete).

### Groq Moderation
- Moderation is in `src/services/groqModeration.ts`.
- Always fail **open** (allow upload if API is unreachable).
- Call moderation BEFORE saving to DB, AFTER Cloudinary upload.
- If image fails: delete from Cloudinary, flash error, redirect to form.

### Rate Limiting
- Rate limit middleware is in `src/middleware/rateLimit.ts`.
- Apply to: POST `/login`, POST `/register`, POST `/campgrounds`.
- Fail open on Redis errors.

### PWA
- Service Worker (`public/sw.js`) and manifest (`public/manifest.json`) are at the root of `public/`.
- Icons are in `public/icons/`.
- Install button is in `views/partials/navbar.ejs` (hidden by default; shown via `pwa.js`).

## What NOT to Do
- ❌ Never write business logic in route files — put it in controllers.
- ❌ Never hardcode API keys — use `process.env.*`.
- ❌ Never use `require()` in TypeScript source — use ES module `import`.
- ❌ Never commit `.env` — it contains real secrets.
- ❌ Never duplicate middleware — reuse from `src/middleware.ts`.
- ❌ Never use `YelpCamp` anywhere — the project is **SpotSync**.

## After Every Coding Session
1. Update `SESSION.md` with what was done and what's next.
2. Update `TASKS.md` — mark completed items, add new ones.
3. Update `PROJECT.md` if architecture changed.
4. Run `npm run lint` (type check) before committing.
5. Run `npm test` to verify nothing is broken.
6. Commit with a descriptive message: `feat: ...`, `fix: ...`, `refactor: ...`.
