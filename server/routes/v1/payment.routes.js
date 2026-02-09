const express = require('express');
const {
  createPaymentIntent,
  getUserPayments,
  getPaymentByBookingId,
  getPaymentByTransactionId,
} = require('@controllers/v1/payment.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const paymentSchema = require('@validators/v1/payment.schema');
const router = express.Router();

// root route: /api/payments
// All routes require authentication
router.use(authenticate);

/**
 * GET /api/payments
 * Get all payments for authenticated user (with pagination)
 */
router.get('/', validate(paymentSchema.getUserPayments), getUserPayments);

/**
 * POST /api/payments
 * Create a payment intent for booking
 */
router.post(
  '/',
  validate(paymentSchema.createPaymentIntent),
  createPaymentIntent
);

/**
 * GET /api/payments/bookings/:bookingId
 * Get payment information by booking ID
 */
router.get(
  '/bookings/:bookingId',
  validate(paymentSchema.getPaymentByBookingId),
  getPaymentByBookingId
);

/**
 * GET /api/payments/transactions/:transactionId
 * Get payment information by transaction ID
 */
router.get(
  '/transactions/:transactionId',
  validate(paymentSchema.getPaymentByTransactionId),
  getPaymentByTransactionId
);

module.exports = router;
