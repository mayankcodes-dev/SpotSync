import { Request, Response } from 'express';
import Review from '../models/review';
import Campground from '../models/campground';
import { CACHE_KEYS, deleteCache } from '../services/redis';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that spot!');
    res.redirect('/spots');
    return;
  }
  const review = new Review(req.body.review);
  review.author = (req.user as any)._id;
  (campground.reviews as any[]).push(review);
  await review.save();
  await campground.save();

  // Invalidate campground cache
  await deleteCache(CACHE_KEYS.campgroundById(id));

  req.flash('success', 'Created new review!');
  res.redirect(`/spots/${campground._id}`);
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { reviewID } = req.params;
  await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewID } });
  await Review.findByIdAndDelete(reviewID);

  // Invalidate campground cache
  await deleteCache(CACHE_KEYS.campgroundById(id));

  req.flash('success', 'Successfully deleted review!');
  res.redirect(`/spots/${id}`);
};
