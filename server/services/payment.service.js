const paymentRepository = require('@repositories/payment.repository');
const bookingRepository = require('@repositories/booking.repository');
const transactionRepository = require('@repositories/transaction.repository');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');
const sequelize = require('@config/database.config');

/**
 * Refactored Payment Service
 *
 * Responsibilities:
 * - Business logic for payments
 * - Idempotent state transitions
 * - Database transactions
 * - Coordinating between entities (bookings, payments, invoices)
 *
 * Does NOT:
 * - Parse webhooks (that's adapter's job)
 * - Know about Stripe-specific details
 * - Handle HTTP requests (that's controller's job)
 */
class PaymentService {
  constructor() {
    // Default to Stripe, but can be swapped with PayPal, etc.
    this.paymentProvider = new StripePaymentAdapter();
  }

  /**
   * Set payment provider (for testing or switching providers)
   */
  setPaymentProvider(provider) {
    this.paymentProvider = provider;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(userId, paymentData) {
    const { paymentMethodId, amount, currency, bookingDetails } = paymentData;

    // Validate required fields
    if (!paymentMethodId || !amount || !currency || !bookingDetails) {
      throw new ApiError(
        400,
        'MISSING_REQUIRED_FIELDS',
        'paymentMethodId, amount, currency, and bookingDetails are required'
      );
    }

    // Validate booking details
    if (
      !bookingDetails.bookingCode ||
      !bookingDetails.hotelId ||
      !bookingDetails.checkInDate ||
      !bookingDetails.checkOutDate ||
      !bookingDetails.numberOfGuests
    ) {
      throw new ApiError(
        400,
        'INVALID_BOOKING_DETAILS',
        'bookingDetails must include bookingCode, hotelId, checkInDate, checkOutDate, and numberOfGuests'
      );
    }

    // Validate amount
    if (amount <= 0) {
      throw new ApiError(
        400,
        'INVALID_AMOUNT',
        'Amount must be greater than 0'
      );
    }

    try {
      // Create payment through adapter
      const payment = await this.paymentProvider.createPayment({
        amount,
        currency,
        paymentMethodId,
        returnUrl: process.env.CLIENT_HOST
          ? `${process.env.CLIENT_HOST}/book/complete`
          : 'http://localhost:5173/book/complete',
        metadata: {
          booking_code: bookingDetails.bookingCode,
          hotel_id: bookingDetails.hotelId.toString(),
          buyer_id: userId.toString(),
          booked_rooms: JSON.stringify(bookingDetails.bookedRooms || []),
          check_in_date: bookingDetails.checkInDate,
          check_out_date: bookingDetails.checkOutDate,
          number_of_guests: bookingDetails.numberOfGuests.toString(),
        },
      });

      logger.info('Payment intent created', {
        paymentId: payment.id,
        userId,
        amount,
        provider: payment.provider,
      });

      return {
        clientSecret: payment.clientSecret,
        paymentIntentId: payment.id,
        status: payment.status,
      };
    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw new ApiError(
        error.statusCode || 500,
        error.code || 'PAYMENT_CREATION_FAILED',
        error.message
      );
    }
  }

  /**
   * Handle payment succeeded event
   * Idempotent - can be called multiple times safely
   */
  async handlePaymentSucceeded(context) {
    const { paymentIntentId, bookingCode, hotelId, buyerId, amount, currency } =
      context;

    logger.info('Processing payment succeeded', {
      paymentIntentId,
      bookingCode,
    });

    // Use database transaction for atomicity
    const transaction = await sequelize.transaction();

    try {
      // 1. Check if transaction already exists (idempotency)
      let dbTransaction = await transactionRepository.findByPaymentIntentId(
        paymentIntentId,
        { transaction }
      );

      if (dbTransaction && dbTransaction.status === 'completed') {
        logger.info('Payment already processed (idempotent)', {
          paymentIntentId,
        });
        await transaction.commit();
        return { success: true, alreadyProcessed: true };
      }

      // 2. Create or update transaction
      if (!dbTransaction) {
        dbTransaction = await transactionRepository.create(
          {
            buyer_id: buyerId,
            hotel_id: hotelId,
            amount,
            currency: currency.toUpperCase(),
            status: 'completed',
            transaction_type: 'booking_payment',
            payment_intent_id: paymentIntentId,
            charge_id: context.chargeId,
            booking_code: bookingCode,
          },
          { transaction }
        );
      } else {
        // Update existing transaction
        await transactionRepository.update(
          dbTransaction.id,
          {
            status: 'completed',
            charge_id: context.chargeId,
            booking_code: bookingCode,
          },
          { transaction }
        );
      }

      // 3. Create or update payment record
      const existingPayment = await paymentRepository.findByTransactionId(
        dbTransaction.id,
        { transaction }
      );

      if (!existingPayment) {
        await paymentRepository.create(
          {
            transaction_id: dbTransaction.id,
            amount,
            currency: currency.toUpperCase(),
            payment_method: context.paymentMethod || 'card',
            payment_status: 'succeeded',
            stripe_payment_method_id: context.paymentMethodId,
            card_brand: context.cardBrand,
            card_last4: context.cardLast4,
            card_exp_month: context.cardExpMonth,
            card_exp_year: context.cardExpYear,
            paid_at: new Date(),
            metadata: {
              payment_intent_id: paymentIntentId,
              charge_id: context.chargeId,
            },
          },
          { transaction }
        );
      } else {
        await paymentRepository.update(
          existingPayment.id,
          {
            payment_status: 'succeeded',
            payment_method: context.paymentMethod || 'card',
            stripe_payment_method_id: context.paymentMethodId,
            card_brand: context.cardBrand,
            card_last4: context.cardLast4,
            paid_at: new Date(),
          },
          { transaction }
        );
      }

      // 4. Create bookings (if not already created)
      const existingBookings = await bookingRepository.findByBookingCode(
        bookingCode,
        { transaction }
      );

      if (existingBookings.length === 0) {
        const { bookedRooms, checkInDate, checkOutDate, numberOfGuests } =
          context;

        for (const room of bookedRooms) {
          await bookingRepository.create(
            {
              buyer_id: buyerId,
              hotel_id: hotelId,
              room_id: room.room_id,
              check_in_date: checkInDate,
              check_out_date: checkOutDate,
              total_price: amount,
              status: 'confirmed',
              number_of_guests: numberOfGuests,
              quantity: room.roomQuantity,
              booking_code: bookingCode,
            },
            { transaction }
          );
        }
      }

      // 5. Create invoice (will be done separately or here)
      // ... invoice creation logic

      await transaction.commit();

      logger.info('Payment succeeded processed successfully', {
        paymentIntentId,
        bookingCode,
      });

      return {
        success: true,
        transactionId: dbTransaction.id,
        bookingCode,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error processing payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed event
   * Idempotent
   */
  async handlePaymentFailed(context) {
    const {
      paymentIntentId,
      buyerId,
      hotelId,
      amount,
      currency,
      failureCode,
      failureMessage,
    } = context;

    logger.info('Processing payment failed', { paymentIntentId });

    try {
      // Check if already recorded
      const existing =
        await transactionRepository.findByPaymentIntentId(paymentIntentId);

      if (existing && existing.status === 'failed') {
        logger.info('Payment failure already recorded (idempotent)', {
          paymentIntentId,
        });
        return { success: true, alreadyProcessed: true };
      }

      if (!existing) {
        // Create failed transaction record
        const transaction = await transactionRepository.create({
          buyer_id: buyerId,
          hotel_id: hotelId,
          amount,
          currency: currency.toUpperCase(),
          status: 'failed',
          transaction_type: 'booking_payment',
          payment_intent_id: paymentIntentId,
        });

        // Create failed payment record
        await paymentRepository.create({
          transaction_id: transaction.id,
          amount,
          currency: currency.toUpperCase(),
          payment_method: context.paymentMethod || 'unknown',
          payment_status: 'failed',
          failure_code: failureCode,
          failure_message: failureMessage,
          paid_at: new Date(),
        });
      } else {
        // Update existing to failed
        await transactionRepository.update(existing.id, {
          status: 'failed',
        });
      }

      logger.info('Payment failed processed successfully', { paymentIntentId });

      return { success: true };
    } catch (error) {
      logger.error('Error processing payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle refund succeeded event
   * Idempotent
   */
  async handleRefundSucceeded(context) {
    const { chargeId, refundId, refundAmount, bookingCode } = context;

    logger.info('Processing refund succeeded', {
      chargeId,
      refundId,
      bookingCode,
    });

    const transaction = await sequelize.transaction();

    try {
      // Find transaction by charge ID
      const dbTransaction = await transactionRepository.findByChargeId(
        chargeId,
        {
          transaction,
        }
      );

      if (!dbTransaction) {
        throw new Error(`Transaction not found for charge: ${chargeId}`);
      }

      // Update booking status to cancelled
      await bookingRepository.updateByBookingCode(
        bookingCode,
        { status: 'cancelled' },
        { transaction }
      );

      // Create refund record (if not exists)
      // ... refund repository logic

      // Update room inventory (release reserved rooms)
      // ... inventory update logic

      await transaction.commit();

      logger.info('Refund succeeded processed successfully', {
        refundId,
        bookingCode,
      });

      return { success: true };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error processing refund succeeded:', error);
      throw error;
    }
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId, userId) {
    const payment = await paymentRepository.findPaymentByBookingId(bookingId);

    if (!payment) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
    }

    // Verify authorization
    if (payment.buyer_id !== userId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view this payment'
      );
    }

    return payment;
  }

  /**
   * Get user payments with pagination
   */
  async getUserPayments(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    const result = await paymentRepository.findPaymentsByBuyerId(userId, {
      limit: validatedLimit,
      offset,
    });

    return {
      payments: result.rows,
      page,
      limit: validatedLimit,
      total: result.count,
    };
  }
}

module.exports = new PaymentService();
