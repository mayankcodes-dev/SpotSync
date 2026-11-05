import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client with a short timeout so a down/unreachable
// Upstash instance never stalls incoming HTTP requests for more than 3 s.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  retry: { retries: 0 }, // no retries — fail fast
  signal: undefined,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Race a promise against a timeout. Returns undefined when the timeout wins.
 * This prevents Redis calls from blocking requests when Upstash is unreachable.
 */
function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

// Rate limiters

// Auth routes: 10 requests per 60 seconds per IP
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
  prefix: 'spotsync:auth',
});

// Campground creation: 5 requests per 60 seconds per IP
export const campgroundCreateRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: 'spotsync:campground:create',
});

// Cache helper functions
export const CACHE_TTL = 300; // 5 minutes in seconds

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await withTimeout(redis.get<T>(key), 2500);
    return data ?? null;
  } catch (err) {
    console.error(`Redis getCached error for key "${key}":`, err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    await withTimeout(redis.setex(key, ttl, JSON.stringify(value)), 2500);
  } catch (err) {
    console.error(`Redis setCache error for key "${key}":`, err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await withTimeout(redis.del(key), 2500);
  } catch (err) {
    console.error(`Redis deleteCache error for key "${key}":`, err);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await withTimeout(redis.keys(pattern), 2500);
    if (keys && keys.length > 0) {
      await withTimeout(redis.del(...keys), 2500);
    }
  } catch (err) {
    console.error(`Redis deleteCachePattern error for pattern "${pattern}":`, err);
  }
}

// Cache keys
export const CACHE_KEYS = {
  campgroundsAll: 'spotsync:campgrounds:all',
  campgroundById: (id: string) => `spotsync:campground:${id}`,
};
