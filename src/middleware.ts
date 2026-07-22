import { Request, Response, NextFunction } from 'express';
import { campgroundSchema, reviewSchema } from './schemas';
import Campground from './models/campground';
import ExpressError from './utils/ExpressError';
import Review from './models/review';

// Middleware: ensure user is authenticated
export const isLoggedIn = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be signed in first!');
    res.redirect('/login');
    return;
  }
  next();
};

// Middleware: store returnTo URL in locals before passport clears the session
export const storeReturnTo = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

// Middleware: validate campground data with Joi schema
export const validateCampground = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = campgroundSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

// Middleware: check user is campground author
export const isAuthor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    res.redirect('/campgrounds');
    return;
  }
  if (!campground.author.equals((req.user as any)._id)) {
    req.flash('error', 'You do not have permission to do that!');
    res.redirect(`/campgrounds/${campground._id}`);
    return;
  }
  next();
};

// Middleware: validate review data
export const validateReview = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(',');
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

// Middleware: check user is review author
export const isReviewAuthor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id, reviewID } = req.params;
  const review = await Review.findById(reviewID);
  if (!review) {
    req.flash('error', 'Cannot find that review!');
    res.redirect(`/campgrounds/${id}`);
    return;
  }
  if (!review.author.equals((req.user as any)._id)) {
    req.flash('error', 'You do not have permission to do that!');
    res.redirect(`/campgrounds/${id}`);
    return;
  }
  next();
};
