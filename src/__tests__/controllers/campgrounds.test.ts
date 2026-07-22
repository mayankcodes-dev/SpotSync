// ── All mocks BEFORE any imports ──────────────────────────────────────────────

// Provide env vars BEFORE any module is loaded so Groq doesn't throw
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_KEY = '123456';
process.env.CLOUDINARY_SECRET = 'test-secret';
process.env.MAPTILER_API_KEY = 'test-maptiler';
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

jest.mock('../../models/campground');
jest.mock('../../services/groqModeration');
jest.mock('../../services/redis', () => ({
  getCached: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  CACHE_KEYS: {
    campgroundsAll: 'spotsync:campgrounds:all',
    campgroundById: (id: string) => `spotsync:campground:${id}`,
  },
}));
jest.mock('../../cloudinary', () => ({
  cloudinary: { uploader: { destroy: jest.fn() } },
  storage: {},
}));
jest.mock('@maptiler/client', () => ({
  geocoding: {
    forward: jest.fn().mockResolvedValue({
      features: [{ geometry: { type: 'Point', coordinates: [-105.5, 40.0] } }],
    }),
  },
  config: { apiKey: '' },
}));

import { Request, Response, NextFunction } from 'express';
import * as campgroundController from '../../controllers/campgrounds';
import Campground from '../../models/campground';
import { moderateImage } from '../../services/groqModeration';
import { getCached, setCache, deleteCache } from '../../services/redis';

const mockCampground = {
  _id: 'camp123',
  title: 'Mountain Camp',
  description: 'A beautiful mountain spot',
  location: 'Colorado, USA',
  price: 25,
  images: [{ url: 'https://example.com/img.jpg', filename: 'test-img' }],
  geometry: { type: 'Point', coordinates: [-105.5, 40.0] },
  author: 'user123',
  reviews: [],
  save: jest.fn().mockResolvedValue(true),
  toJSON: jest.fn().mockReturnValue({
    _id: 'camp123',
    title: 'Mountain Camp',
    geometry: { type: 'Point', coordinates: [-105.5, 40.0] },
  }),
};

const mockReq = (overrides = {}): Partial<Request> => ({
  params: {},
  body: {},
  flash: jest.fn().mockReturnValue([]),
  user: { _id: 'user123' } as any,
  files: [],
  ...overrides,
});

const mockRes = (): Partial<Response> => ({
  render: jest.fn(),
  redirect: jest.fn(),
  locals: {},
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const mockNext: NextFunction = jest.fn();

describe('Campgrounds Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCached as jest.Mock).mockResolvedValue(null);
    (setCache as jest.Mock).mockResolvedValue(undefined);
    (deleteCache as jest.Mock).mockResolvedValue(undefined);
  });

  describe('index', () => {
    it('should render campgrounds index with campgrounds from DB', async () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;
      (Campground.find as jest.Mock).mockResolvedValue([mockCampground]);

      await campgroundController.index(req, res);

      expect(res.render).toHaveBeenCalledWith('campgrounds/index', expect.objectContaining({
        activePage: 'campgrounds',
      }));
    });

    it('should return cached data when available', async () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;
      (getCached as jest.Mock).mockResolvedValue({
        campgrounds: [mockCampground],
        campgroundsGeoJSON: { type: 'FeatureCollection', features: [] },
      });

      await campgroundController.index(req, res);

      expect(Campground.find).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('campgrounds/index', expect.objectContaining({
        activePage: 'campgrounds',
      }));
    });

    it('should render with empty arrays on DB error', async () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;
      (Campground.find as jest.Mock).mockRejectedValue(new Error('DB error'));

      await campgroundController.index(req, res);

      expect(res.render).toHaveBeenCalledWith('campgrounds/index', expect.objectContaining({
        campgrounds: [],
      }));
    });
  });

  describe('showCampground', () => {
    it('should render show page for existing campground', async () => {
      const req = mockReq({ params: { id: 'camp123' } }) as Request;
      const res = mockRes() as Response;
      (Campground.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockCampground),
        }),
      });

      await campgroundController.showCampground(req, res);

      expect(res.render).toHaveBeenCalledWith('campgrounds/show', expect.objectContaining({
        activePage: 'campgrounds',
      }));
    });

    it('should flash error and redirect if campground not found', async () => {
      const req = mockReq({ params: { id: 'notfound' } }) as Request;
      const res = mockRes() as Response;
      (Campground.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await campgroundController.showCampground(req, res);

      expect(req.flash).toHaveBeenCalledWith('error', expect.any(String));
      expect(res.redirect).toHaveBeenCalledWith('/spots');
    });
  });

  describe('deleteCampground', () => {
    it('should delete campground and redirect', async () => {
      const req = mockReq({ params: { id: 'camp123' } }) as Request;
      const res = mockRes() as Response;
      (Campground.findByIdAndDelete as jest.Mock).mockResolvedValue(mockCampground);

      await campgroundController.deleteCampground(req, res);

      expect(Campground.findByIdAndDelete).toHaveBeenCalledWith('camp123');
      expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
      expect(res.redirect).toHaveBeenCalledWith('/spots');
    });
  });
});
