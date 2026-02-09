const express = require('express');
const {
  getAllBookings,
  getBookingById,
  getBookerInformation,
  updateBookingStatus,
} = require('@controllers/v1/admin/booking.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const bookingSchema = require('@validators/v1/admin/booking.schema');
const router = express.Router();

// Root route: /api/admin/bookings
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/bookings
 * Get all bookings for a specific hotel with pagination and filters
 */
router.get('/', validate(bookingSchema.getAllBookings), getAllBookings);

/**
 * GET /api/admin/bookings/:bookingId
 * Get a specific booking by ID
 */
router.get(
  '/:bookingId',
  validate(bookingSchema.getBookingById),
  getBookingById
);

/**
 * GET /api/admin/bookings/:bookingId/booker
 * Get booker information for a specific booking
 */
router.get(
  '/:bookingId/booker',
  validate(bookingSchema.getBookerInformation),
  getBookerInformation
);

/**
 * PATCH /api/admin/bookings/:bookingId/status
 * Update booking status
 */
router.patch(
  '/:bookingId/status',
  validate(bookingSchema.updateBookingStatus),
  updateBookingStatus
);

module.exports = router;
