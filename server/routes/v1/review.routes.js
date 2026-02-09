const express = require('express');
const {
  getUserReviews,
  getHotelReviews,
  createReview,
  validateReview,
  checkAlreadyReviewed,
} = require('@controllers/v1/review.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const reviewSchema = require('@validators/v1/review.schema');
const router = express.Router();

// root route: /api/reviews
// All routes require authentication
router.use(authenticate);

/**
 * GET /api/reviews
 * Get all reviews for authenticated user
 */
router.get('/', validate(reviewSchema.getUserReviews), getUserReviews);

/**
 * GET /api/reviews/hotels/:hotelId
 * Get reviews for a specific hotel (with pagination)
 */
router.get(
  '/hotels/:hotelId',
  validate(reviewSchema.getHotelReviews),
  getHotelReviews
);

/**
 * GET /api/reviews/validate
 * Validate if user can review a booking
 */
router.get(
  '/validate',
  validate(reviewSchema.validateReview),
  validateReview
);

/**
 * GET /api/reviews/check
 * Check if booking has already been reviewed
 */
router.get(
  '/check',
  validate(reviewSchema.checkAlreadyReviewed),
  checkAlreadyReviewed
);

/**
 * POST /api/reviews
 * Create a review
 */
router.post('/', validate(reviewSchema.createReview), createReview);

module.exports = router;
