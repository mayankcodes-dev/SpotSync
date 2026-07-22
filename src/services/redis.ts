import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

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
    const data = await redis.get<T>(key);
    return data;
  } catch (err) {
    console.error(`Redis getCached error for key "${key}":`, err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error(`Redis setCache error for key "${key}":`, err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Redis deleteCache error for key "${key}":`, err);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
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
