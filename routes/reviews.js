const express = require('express');
const router = express.Router({mergeParams: true});
const Review = require('../models/review');
const reviews = require('../controllers/reviews');
const Campground = require('../models/campground');
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const {validateReview,isLoggedIn,isReviewAuthor} = require('../middleware.js');
const { createReview } = require('../controllers/reviews.js');


router.post('/',validateReview,isLoggedIn, catchAsync(reviews.createReview))

router.delete('/:reviewID',isLoggedIn,isReviewAuthor,catchAsync(reviews.deleteReview))

module.exports = router;