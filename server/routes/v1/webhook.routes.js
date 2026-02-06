const express = require('express');
const router = express.Router();
const {
  handleStripeWebhook,
} = require('@controllers/v1/stripeWebhook.controller');

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint
 */
router.post('/stripe', handleStripeWebhook);

/**
 * POST /api/webhooks/paypal
 * PayPal webhook endpoint
 */
// router.post('/paypal', handlePayPalWebhook);

module.exports = router;
