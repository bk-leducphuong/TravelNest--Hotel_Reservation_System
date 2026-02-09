const express = require('express');
const {
  getAllReviews,
  getReviewById,
  replyToReview,
  updateReply,
  deleteReply,
} = require('@controllers/v1/admin/review.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const reviewSchema = require('@validators/v1/admin/review.schema');
const router = express.Router();

// Root route: /api/admin/reviews
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/reviews
 * Get all reviews for a specific hotel
 */
router.get('/', validate(reviewSchema.getAllReviews), getAllReviews);

/**
 * GET /api/admin/reviews/:reviewId
 * Get a specific review by ID
 */
router.get('/:reviewId', validate(reviewSchema.getReviewById), getReviewById);

/**
 * POST /api/admin/reviews/:reviewId/reply
 * Reply to a review
 */
router.post(
  '/:reviewId/reply',
  validate(reviewSchema.replyToReview),
  replyToReview
);

/**
 * PATCH /api/admin/reviews/:reviewId/reply
 * Update a reply to a review
 */
router.patch(
  '/:reviewId/reply',
  validate(reviewSchema.updateReply),
  updateReply
);

/**
 * DELETE /api/admin/reviews/:reviewId/reply
 * Delete a reply to a review
 */
router.delete(
  '/:reviewId/reply',
  validate(reviewSchema.deleteReply),
  deleteReply
);

module.exports = router;
