import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction, RequestHandler } from 'express';

interface SanitizeOptions {
  replaceWith?: string;
  allowDots?: boolean;
  onSanitize?: (data: { req: Request; key: string }) => void;
}

function deepCopy(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepCopy);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, deepCopy(v)])
  );
}

function sanitizeV5(options: SanitizeOptions = {}): RequestHandler {
  const hasOnSanitize = typeof options.onSanitize === 'function';

  return function (req: Request, _res: Response, next: NextFunction) {
    (['body', 'params', 'headers'] as const).forEach((key) => {
      if ((req as any)[key]) {
        const clean = (mongoSanitize as any).sanitize((req as any)[key], options);
        (req as any)[key] = clean;
        if (hasOnSanitize && (mongoSanitize as any).has(clean, options.allowDots)) {
          options.onSanitize!({ req, key });
        }
      }
    });

    if (req.query) {
      const cleanQuery = (mongoSanitize as any).sanitize(deepCopy(req.query), options);

      Object.defineProperty(req, 'query', {
        value: cleanQuery,
        writable: false,
        configurable: true,
        enumerable: true,
      });

      if (hasOnSanitize && (mongoSanitize as any).has(cleanQuery, options.allowDots)) {
        options.onSanitize!({ req, key: 'query' });
      }
    }

    next();
  };
}

export default sanitizeV5;
