/**
 * Integration tests for campground routes using supertest.
 * External services (DB, Redis, Groq, Cloudinary) are mocked.
 */

// ── All mocks BEFORE any imports ──────────────────────────────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      on: jest.fn(),
      once: jest.fn(),
    },
  };
});

jest.mock('../../models/campground');
jest.mock('../../models/user');
jest.mock('../../models/review');
jest.mock('../../services/groqModeration', () => ({
  moderateImage: jest.fn().mockResolvedValue({ isSafe: true, reason: 'Safe image' }),
}));
jest.mock('../../services/redis', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
  deleteCache: jest.fn().mockResolvedValue(undefined),
  deleteCachePattern: jest.fn().mockResolvedValue(undefined),
  CACHE_KEYS: {
    campgroundsAll: 'spotsync:campgrounds:all',
    campgroundById: (id: string) => `spotsync:campground:${id}`,
  },
  authRateLimiter: {},
  campgroundCreateRateLimiter: {},
}));
jest.mock('../../middleware/rateLimit', () => ({
  loginRateLimit: (_req: any, _res: any, next: any) => next(),
  registerRateLimit: (_req: any, _res: any, next: any) => next(),
  createCampgroundRateLimit: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('connect-mongo', () => ({
  create: jest.fn().mockReturnValue({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    destroy: jest.fn(),
    touch: jest.fn(),
  }),
}));
jest.mock('@maptiler/client', () => ({
  geocoding: {
    forward: jest.fn().mockResolvedValue({
      features: [{ geometry: { type: 'Point', coordinates: [-105.5, 40.0] } }],
    }),
  },
  config: { apiKey: '' },
}));

import request from 'supertest';
import express from 'express';
import Campground from '../../models/campground';

// ── Minimal Express app for testing ──────────────────────────────────────────
function createTestApp() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Mock session middleware
  app.use((req: any, _res: any, next: any) => {
    req.session = { returnTo: null };
    req.flash = jest.fn().mockReturnValue([]);
    req.isAuthenticated = jest.fn().mockReturnValue(true);
    req.user = { _id: 'user123', username: 'testuser' };
    next();
  });

  // Mock EJS rendering
  app.set('view engine', 'ejs');
  app.engine('ejs', (_path: string, _options: any, cb: any) => {
    cb(null, '<html>Test</html>');
  });

  // Import routes
  const campgroundRoutes = require('../../routes/campgrounds').default;
  app.use('/campgrounds', campgroundRoutes);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });

  return app;
}

describe('Campground Routes – Integration', () => {
  let app: express.Application;

  const mockCampgrounds = [
    {
      _id: 'camp1',
      title: 'Forest Camp',
      description: 'Nice forest spot',
      location: 'Oregon, USA',
      price: 20,
      images: [],
      geometry: { type: 'Point', coordinates: [-120.5, 45.0] },
      author: 'user123',
      reviews: [],
    },
  ];

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../services/redis').getCached.mockResolvedValue(null);
  });

  describe('GET /campgrounds', () => {
    it('should return 200 for campground index', async () => {
      (Campground.find as jest.Mock).mockResolvedValue(mockCampgrounds);

      const res = await request(app).get('/campgrounds');
      expect(res.status).toBe(200);
    });

    it('should use cached data when available', async () => {
      require('../../services/redis').getCached.mockResolvedValue({
        campgrounds: mockCampgrounds,
        campgroundsGeoJSON: { type: 'FeatureCollection', features: [] },
      });

      const res = await request(app).get('/campgrounds');
      expect(res.status).toBe(200);
      expect(Campground.find).not.toHaveBeenCalled();
    });
  });

  describe('GET /campgrounds/:id', () => {
    it('should return 200 for existing campground', async () => {
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockCampgrounds[0],
          toJSON: () => mockCampgrounds[0],
        }),
      };
      (Campground.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue(mockPopulate),
      });

      const res = await request(app).get('/campgrounds/camp1');
      expect(res.status).toBe(200);
    });

    it('should redirect to /campgrounds when campground not found', async () => {
      (Campground.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app).get('/campgrounds/nonexistent');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/campgrounds');
    });
  });

  describe('DELETE /campgrounds/:id', () => {
    it('should delete campground and redirect', async () => {
      (Campground.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: 'camp1' });

      const res = await request(app)
        .delete('/campgrounds/camp1');

      expect(res.status).toBe(302);
    });
  });
});
