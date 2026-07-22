import express from 'express';
import catchAsync from '../utils/catchAsync';
import * as reviews from '../controllers/reviews';
import { isLoggedIn, validateReview, isReviewAuthor } from '../middleware';

const router = express.Router({ mergeParams: true });

router.post('/', isLoggedIn, validateReview, catchAsync(reviews.createReview));
router.delete('/:reviewID', isLoggedIn, isReviewAuthor, catchAsync(reviews.deleteReview));

export default router;
