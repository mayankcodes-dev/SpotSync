import express from 'express';
import catchAsync from '../utils/catchAsync';
import * as campgrounds from '../controllers/campgrounds';
import { isLoggedIn, isAuthor, validateCampground } from '../middleware';
import { createCampgroundRateLimit } from '../middleware/rateLimit';
import multer from 'multer';
import { storage } from '../cloudinary';

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10 MB per file, max 5 files
});
const router = express.Router();

router.route('/')
  .get(catchAsync(campgrounds.index))
  .post(
    isLoggedIn,
    createCampgroundRateLimit,
    upload.array('image'),
    validateCampground,
    catchAsync(campgrounds.createCampground)
  );

router.get('/new', isLoggedIn, campgrounds.renderNewForm);

router.route('/:id')
  .get(catchAsync(campgrounds.showCampground))
  .put(
    isLoggedIn,
    isAuthor,
    upload.array('image'),
    validateCampground,
    catchAsync(campgrounds.updateCampground)
  )
  .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm));

export default router;
