import { Request, Response, NextFunction, RequestHandler } from 'express';
import { authRateLimiter, campgroundCreateRateLimiter } from '../services/redis';

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function makeRateLimitMiddleware(
  limiter: typeof authRateLimiter,
  redirectPath: string,
  errorMsg: string = 'Too many requests. Please try again later.'
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = getClientIp(req);
      // Race against a 2.5 s timeout — if Redis is unreachable, fail open
      const result = await Promise.race([
        limiter.limit(identifier),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2500)),
      ]);

      // Timed out or error — allow the request through
      if (!result) {
        next();
        return;
      }

      const { success, limit, remaining, reset } = result;
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', reset.toString());

      if (!success) {
        req.flash('error', errorMsg);
        res.redirect(redirectPath);
        return;
      }
      next();
    } catch (err) {
      // If Redis is down, fail open (allow request through)
      console.error('Rate limit middleware error:', err);
      next();
    }
  };
}

// Rate limit for login route
export const loginRateLimit = makeRateLimitMiddleware(
  authRateLimiter,
  '/login',
  'Too many login attempts. Please wait a minute and try again.'
);

// Rate limit for register route
export const registerRateLimit = makeRateLimitMiddleware(
  authRateLimiter,
  '/register',
  'Too many registration attempts. Please wait a minute and try again.'
);

// Rate limit for campground creation
export const createCampgroundRateLimit = makeRateLimitMiddleware(
  campgroundCreateRateLimiter,
  '/spots/new',
  'Too many campground submissions. Please wait a minute and try again.'
);
