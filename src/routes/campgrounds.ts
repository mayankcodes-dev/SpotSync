import express from 'express';
import catchAsync from '../utils/catchAsync';
import * as campgrounds from '../controllers/campgrounds';
import { isLoggedIn, isAuthor, validateCampground } from '../middleware';
import { createCampgroundRateLimit } from '../middleware/rateLimit';
import multer from 'multer';
import { storage } from '../cloudinary';
import { destroyImages } from '../utils/cloudinaryCleanup';

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10 MB per file, max 5 files
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Only JPG, PNG, or WebP images are allowed.'));
      return;
    }
    callback(null, true);
  },
});

const uploadImages = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  upload.array('image')(req, res, async (err) => {
    if (err) {
      const uploadedImages = ((req.files as any[]) || []).map((file) => ({
        filename: file.filename as string,
      }));
      await destroyImages(uploadedImages);
      next(err);
      return;
    }
    next();
  });
};

const router = express.Router();

router.route('/')
  .get(catchAsync(campgrounds.index))
  .post(
    isLoggedIn,
    createCampgroundRateLimit,
    uploadImages,
    validateCampground,
    catchAsync(campgrounds.createCampground)
  );

router.get('/new', isLoggedIn, campgrounds.renderNewForm);

router.route('/:id')
  .get(catchAsync(campgrounds.showCampground))
  .put(
    isLoggedIn,
    isAuthor,
    uploadImages,
    validateCampground,
    catchAsync(campgrounds.updateCampground)
  )
  .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm));

export default router;
