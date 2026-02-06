require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const config = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  client: stripe,
  // Stripe-specific settings
  apiVersion: '2024-12-18.acacia', // Lock API version for consistency
  maxNetworkRetries: 2,
  timeout: 30000, // 30 seconds
};

module.exports = config;
