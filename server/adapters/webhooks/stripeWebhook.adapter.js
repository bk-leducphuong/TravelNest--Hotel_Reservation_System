const logger = require('@config/logger.config');

/**
 * Stripe Webhook Adapter
 * Responsibilities:
 * - Verify webhook signatures
 * - Parse Stripe events
 * - Extract stable business data (bookingId, paymentId, etc.)
 * - Handle event deduplication
 */
class StripeWebhookAdapter {
  constructor(paymentAdapter, eventLogRepository) {
    this.paymentAdapter = paymentAdapter;
    this.eventLogRepository = eventLogRepository;
  }

  /**
   * Verify and parse webhook
   */
  async verifyAndParse(rawBody, signature) {
    try {
      const event = this.paymentAdapter.verifyWebhook(rawBody, signature);

      logger.info('Stripe webhook received', {
        eventId: event.id,
        eventType: event.type,
      });

      return event;
    } catch (error) {
      logger.error('Webhook verification failed:', error);
      throw error;
    }
  }

  /**
   * Check if event was already processed (idempotency)
   * Returns true if event is duplicate
   */
  async isDuplicate(eventId) {
    try {
      const existing = await this.eventLogRepository.findByEventId(eventId);
      return !!existing;
    } catch (error) {
      logger.error('Error checking event duplication:', error);
      // If we can't check, assume not duplicate to avoid blocking
      return false;
    }
  }

  /**
   * Log webhook event for idempotency and audit trail
   */
  async logEvent(eventId, eventType, payload) {
    try {
      await this.eventLogRepository.create({
        eventId,
        eventType,
        provider: 'stripe',
        payload: JSON.stringify(payload),
        processedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error logging webhook event:', error);
    }
  }

  /**
   * Extract booking context from payment succeeded event
   */
  extractPaymentSucceededContext(event) {
    const paymentIntent = event.data;
    const metadata = paymentIntent.metadata || {};

    return {
      eventId: event.id,
      eventType: event.type,
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      // Business context from metadata
      bookingCode: metadata.booking_code,
      hotelId: metadata.hotel_id,
      buyerId: metadata.buyer_id,
      bookedRooms: metadata.booked_rooms
        ? JSON.parse(metadata.booked_rooms)
        : [],
      checkInDate: metadata.check_in_date,
      checkOutDate: metadata.check_out_date,
      numberOfGuests: parseInt(metadata.number_of_guests, 10),
      // Additional payment details
      paymentMethodId: paymentIntent.payment_method,
      receiptEmail: null, // Will be enriched later if needed
    };
  }

  /**
   * Extract booking context from payment failed event
   */
  extractPaymentFailedContext(event) {
    const paymentIntent = event.data;
    const metadata = paymentIntent.metadata || {};

    return {
      eventId: event.id,
      eventType: event.type,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
      // Business context
      bookingCode: metadata.booking_code,
      hotelId: metadata.hotel_id,
      buyerId: metadata.buyer_id,
      paymentMethodId: paymentIntent.payment_method,
    };
  }

  /**
   * Extract refund context from charge.refunded event
   */
  extractRefundContext(event) {
    const charge = event.data;
    const metadata = charge.metadata || {};

    // Get refund details
    const refunds = charge.refunds?.data || [];
    const latestRefund = refunds[refunds.length - 1];

    return {
      eventId: event.id,
      eventType: event.type,
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
      refundId: latestRefund?.id,
      refundAmount: latestRefund?.amount,
      refundStatus: latestRefund?.status,
      refundReason: latestRefund?.reason,
      // Business context
      bookingCode: metadata.booking_code,
      hotelId: metadata.hotel_id,
      buyerId: metadata.buyer_id,
      bookedRooms: metadata.booked_rooms
        ? JSON.parse(metadata.booked_rooms)
        : [],
      checkInDate: metadata.check_in_date,
      checkOutDate: metadata.check_out_date,
      numberOfGuests: parseInt(metadata.number_of_guests, 10),
    };
  }

  /**
   * Extract payout context
   */
  extractPayoutContext(event) {
    const payout = event.data;
    const metadata = payout.metadata || {};

    return {
      eventId: event.id,
      eventType: event.type,
      payoutId: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date,
      // Business context
      transactionId: metadata.transaction_id,
      hotelId: metadata.hotel_id,
    };
  }

  /**
   * Enrich payment context with payment method details
   */
  async enrichWithPaymentMethod(context) {
    if (!context.paymentMethodId) {
      return context;
    }

    try {
      const paymentMethod = await this.paymentAdapter.getPaymentMethod(
        context.paymentMethodId
      );

      return {
        ...context,
        paymentMethod: paymentMethod.type,
        cardBrand: paymentMethod.card?.brand,
        cardLast4: paymentMethod.card?.last4,
        cardExpMonth: paymentMethod.card?.expMonth,
        cardExpYear: paymentMethod.card?.expYear,
        receiptEmail: paymentMethod.billingDetails?.email,
      };
    } catch (error) {
      logger.error('Error enriching payment method:', error);
      // Continue without enrichment
      return context;
    }
  }
}

module.exports = StripeWebhookAdapter;
