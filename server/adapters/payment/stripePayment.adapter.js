const PaymentProviderInterface = require('@interfaces/paymentProvider.interface');
const stripeConfig = require('@config/stripe.config');
const logger = require('@config/logger.config');

/**
 * Stripe Payment Adapter
 *
 * Implements the payment provider interface for Stripe.
 * Isolates Stripe-specific logic from business logic.
 */
class StripePaymentAdapter extends PaymentProviderInterface {
  constructor() {
    super();
    this.stripe = stripeConfig.client;
    this.webhookSecret = stripeConfig.webhookSecret;
  }

  /**
   * Create a Stripe payment intent
   */
  async createPayment(params) {
    const { amount, currency, paymentMethodId, metadata, returnUrl } = params;

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Ensure integer
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        return_url: returnUrl,
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: this.normalizeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        provider: 'stripe',
        raw: paymentIntent,
      };
    } catch (error) {
      logger.error('Stripe payment creation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId) {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        id: paymentIntent.id,
        status: this.normalizeStatus(paymentIntent.status),
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        provider: 'stripe',
        raw: paymentIntent,
      };
    } catch (error) {
      logger.error('Stripe payment retrieval failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentId);

      return {
        id: paymentIntent.id,
        status: this.normalizeStatus(paymentIntent.status),
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe payment cancellation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Create a refund
   */
  async refundPayment(params) {
    const { paymentId, amount, reason } = params;

    try {
      // Get the charge ID from payment intent
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentId);
      const chargeId = paymentIntent.latest_charge;

      if (!chargeId) {
        throw new Error('No charge found for this payment intent');
      }

      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount) : undefined, // Partial or full refund
        reason: reason || 'requested_by_customer',
        metadata: {
          payment_intent_id: paymentId,
        },
      });

      return {
        id: refund.id,
        paymentId: paymentId,
        amount: refund.amount,
        currency: refund.currency,
        status: this.normalizeRefundStatus(refund.status),
        provider: 'stripe',
        raw: refund,
      };
    } catch (error) {
      logger.error('Stripe refund creation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhook(payload, signature) {
    try {
      if (!this.webhookSecret) {
        logger.warn(
          'Stripe webhook secret not configured, skipping verification'
        );
        return JSON.parse(payload.toString());
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        created: event.created,
        provider: 'stripe',
        raw: event,
      };
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Get provider name
   */
  getProviderName() {
    return 'stripe';
  }

  /**
   * Normalize Stripe payment status to common status
   */
  normalizeStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'cancelled',
      succeeded: 'succeeded',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  /**
   * Normalize Stripe refund status
   */
  normalizeRefundStatus(stripeStatus) {
    const statusMap = {
      pending: 'processing',
      succeeded: 'succeeded',
      failed: 'failed',
      canceled: 'cancelled',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  /**
   * Normalize Stripe errors to common error format
   */
  normalizeError(error) {
    const normalizedError = new Error(error.message);
    normalizedError.code = error.code || 'UNKNOWN_ERROR';
    normalizedError.type = error.type || 'api_error';
    normalizedError.statusCode = error.statusCode || 500;
    normalizedError.provider = 'stripe';
    normalizedError.raw = error;

    return normalizedError;
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            }
          : null,
        billingDetails: paymentMethod.billing_details,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe payment method retrieval failed:', error);
      throw this.normalizeError(error);
    }
  }
}

module.exports = StripePaymentAdapter;
