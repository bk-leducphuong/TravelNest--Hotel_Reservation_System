const {
  Transactions,
  Bookings,
  Hotels,
  Users,
  Payments,
} = require('@models/index.js');
const { Op } = require('sequelize');
const logger = require('@config/logger.config');

/**
 * Transaction Repository
 */
class TransactionRepository {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @param {Object} options - Sequelize options (e.g., transaction)
   * @returns {Promise<Transaction>}
   */
  async create(transactionData, options = {}) {
    try {
      return await Transactions.create(
        {
          booking_id: transactionData.bookingId,
          buyer_id: transactionData.buyerId,
          hotel_id: transactionData.hotelId,
          amount: transactionData.amount,
          currency: transactionData.currency || 'USD',
          status: transactionData.status || 'pending',
          transaction_type: transactionData.transactionType || 'payment',
          payment_method: transactionData.paymentMethod,
          stripe_payment_intent_id: transactionData.paymentIntentId,
          stripe_charge_id: transactionData.chargeId,
          stripe_customer_id: transactionData.customerId,
          stripe_refund_id: transactionData.refundId,
          failure_code: transactionData.failureCode,
          failure_message: transactionData.failureMessage,
          metadata: transactionData.metadata,
          completed_at: transactionData.completedAt,
        },
        options
      );
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   * @param {string} transactionId - Transaction ID (UUID)
   * @param {Object} options - Query options
   * @returns {Promise<Transaction|null>}
   */
  async findById(transactionId, options = {}) {
    try {
      return await Transactions.findOne({
        where: { id: transactionId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Find transaction by payment intent ID (Stripe)
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {Object} options - Query options
   * @returns {Promise<Transaction|null>}
   */
  async findByPaymentIntentId(paymentIntentId, options = {}) {
    try {
      return await Transactions.findOne({
        where: { stripe_payment_intent_id: paymentIntentId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding transaction by payment intent ID:', error);
      throw error;
    }
  }

  /**
   * Find transaction by charge ID (Stripe)
   * @param {string} chargeId - Stripe charge ID
   * @param {Object} options - Query options
   * @returns {Promise<Transaction|null>}
   */
  async findByChargeId(chargeId, options = {}) {
    try {
      return await Transactions.findOne({
        where: { stripe_charge_id: chargeId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding transaction by charge ID:', error);
      throw error;
    }
  }

  /**
   * Find transaction by booking ID
   * @param {string} bookingId - Booking ID (UUID)
   * @param {Object} options - Query options
   * @returns {Promise<Transaction|null>}
   */
  async findByBookingId(bookingId, options = {}) {
    try {
      return await Transactions.findOne({
        where: { booking_id: bookingId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding transaction by booking ID:', error);
      throw error;
    }
  }

  /**
   * Find transactions by buyer ID
   * @param {string} buyerId - Buyer (user) ID (UUID)
   * @param {Object} options - Query options (limit, offset, include, etc.)
   * @returns {Promise<{rows: Transaction[], count: number}>}
   */
  async findByBuyerId(buyerId, options = {}) {
    try {
      const { limit, offset, include, order, ...restOptions } = options;

      return await Transactions.findAndCountAll({
        where: { buyer_id: buyerId },
        include: include || [
          {
            model: Payments,
            as: 'payments',
            attributes: [
              'id',
              'payment_method',
              'payment_status',
              'amount',
              'currency',
              'paid_at',
            ],
          },
          {
            model: Hotels,
            as: 'hotel',
            attributes: ['id', 'name', 'city', 'country'],
          },
          {
            model: Bookings,
            as: 'booking',
            attributes: [
              'id',
              'booking_code',
              'check_in_date',
              'check_out_date',
            ],
          },
        ],
        limit: limit || undefined,
        offset: offset || undefined,
        order: order || [['created_at', 'DESC']],
        ...restOptions,
      });
    } catch (error) {
      logger.error('Error finding transactions by buyer ID:', error);
      throw error;
    }
  }

  /**
   * Find transactions by hotel ID
   * @param {string} hotelId - Hotel ID (UUID)
   * @param {Object} options - Query options
   * @returns {Promise<{rows: Transaction[], count: number}>}
   */
  async findByHotelId(hotelId, options = {}) {
    try {
      const { limit, offset, include, order, ...restOptions } = options;

      return await Transactions.findAndCountAll({
        where: { hotel_id: hotelId },
        include: include || [],
        limit: limit || undefined,
        offset: offset || undefined,
        order: order || [['created_at', 'DESC']],
        ...restOptions,
      });
    } catch (error) {
      logger.error('Error finding transactions by hotel ID:', error);
      throw error;
    }
  }

  /**
   * Find transactions by status
   * @param {string} status - Transaction status
   * @param {Object} options - Query options
   * @returns {Promise<{rows: Transaction[], count: number}>}
   */
  async findByStatus(status, options = {}) {
    try {
      const { limit, offset, include, order, ...restOptions } = options;

      return await Transactions.findAndCountAll({
        where: { status },
        include: include || [],
        limit: limit || undefined,
        offset: offset || undefined,
        order: order || [['created_at', 'DESC']],
        ...restOptions,
      });
    } catch (error) {
      logger.error('Error finding transactions by status:', error);
      throw error;
    }
  }

  /**
   * Update transaction by ID
   * @param {string} transactionId - Transaction ID (UUID)
   * @param {Object} updateData - Data to update
   * @param {Object} options - Sequelize options (e.g., transaction)
   * @returns {Promise<[number, Transaction[]]>} - [affectedCount, updatedRecords]
   */
  async update(transactionId, updateData, options = {}) {
    try {
      // Map common field names to database column names
      const mappedData = {};
      if (updateData.status !== undefined)
        mappedData.status = updateData.status;
      if (updateData.chargeId !== undefined)
        mappedData.stripe_charge_id = updateData.chargeId;
      if (updateData.paymentIntentId !== undefined)
        mappedData.stripe_payment_intent_id = updateData.paymentIntentId;
      if (updateData.refundId !== undefined)
        mappedData.stripe_refund_id = updateData.refundId;
      if (updateData.failureCode !== undefined)
        mappedData.failure_code = updateData.failureCode;
      if (updateData.failureMessage !== undefined)
        mappedData.failure_message = updateData.failureMessage;
      if (updateData.metadata !== undefined)
        mappedData.metadata = updateData.metadata;
      if (updateData.completedAt !== undefined)
        mappedData.completed_at = updateData.completedAt;
      if (updateData.paymentMethod !== undefined)
        mappedData.payment_method = updateData.paymentMethod;

      return await Transactions.update(mappedData, {
        where: { id: transactionId },
        ...options,
      });
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   * @param {string} transactionId - Transaction ID (UUID)
   * @param {string} status - New status
   * @param {Object} options - Sequelize options
   * @returns {Promise<[number, Transaction[]]>}
   */
  async updateStatus(transactionId, status, options = {}) {
    try {
      return await this.update(transactionId, { status }, options);
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Find transactions with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, include, etc.)
   * @returns {Promise<{rows: Transaction[], count: number}>}
   */
  async findAll(filters = {}, options = {}) {
    try {
      const {
        page,
        limit: limitOption,
        offset,
        include,
        order,
        ...restOptions
      } = options;

      const where = {};
      if (filters.buyerId) where.buyer_id = filters.buyerId;
      if (filters.hotelId) where.hotel_id = filters.hotelId;
      if (filters.status) where.status = filters.status;
      if (filters.transactionType)
        where.transaction_type = filters.transactionType;
      if (filters.paymentIntentId)
        where.stripe_payment_intent_id = filters.paymentIntentId;
      if (filters.dateFrom || filters.dateTo) {
        where.created_at = {};
        if (filters.dateFrom) where.created_at[Op.gte] = filters.dateFrom;
        if (filters.dateTo) where.created_at[Op.lte] = filters.dateTo;
      }

      const calculatedLimit = limitOption || (page ? 20 : undefined);
      const calculatedOffset =
        offset || (page ? (page - 1) * calculatedLimit : undefined);

      return await Transactions.findAndCountAll({
        where,
        include: include || [],
        limit: calculatedLimit,
        offset: calculatedOffset,
        order: order || [['created_at', 'DESC']],
        ...restOptions,
      });
    } catch (error) {
      logger.error('Error finding transactions:', error);
      throw error;
    }
  }

  /**
   * Delete transaction (soft delete by updating status)
   * @param {string} transactionId - Transaction ID (UUID)
   * @param {Object} options - Sequelize options
   * @returns {Promise<[number, Transaction[]]>}
   */
  async delete(transactionId, options = {}) {
    try {
      return await this.updateStatus(transactionId, 'cancelled', options);
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a buyer
   * @param {string} buyerId - Buyer (user) ID (UUID)
   * @returns {Promise<Object>} Statistics object
   */
  async getBuyerStatistics(buyerId) {
    try {
      const transactions = await Transactions.findAll({
        where: { buyer_id: buyerId },
        attributes: ['status', 'amount', 'currency'],
      });

      const stats = {
        total: transactions.length,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
        currency: 'USD',
      };

      transactions.forEach((tx) => {
        if (tx.status === 'completed') stats.completed++;
        else if (tx.status === 'pending' || tx.status === 'processing')
          stats.pending++;
        else if (tx.status === 'failed') stats.failed++;

        if (tx.status === 'completed') {
          stats.totalAmount += parseFloat(tx.amount || 0);
          stats.currency = tx.currency || 'USD';
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting buyer statistics:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a hotel
   * @param {string} hotelId - Hotel ID (UUID)
   * @returns {Promise<Object>} Statistics object
   */
  async getHotelStatistics(hotelId) {
    try {
      const transactions = await Transactions.findAll({
        where: { hotel_id: hotelId },
        attributes: ['status', 'amount', 'currency'],
      });

      const stats = {
        total: transactions.length,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
        currency: 'USD',
      };

      transactions.forEach((tx) => {
        if (tx.status === 'completed') stats.completed++;
        else if (tx.status === 'pending' || tx.status === 'processing')
          stats.pending++;
        else if (tx.status === 'failed') stats.failed++;

        if (tx.status === 'completed') {
          stats.totalAmount += parseFloat(tx.amount || 0);
          stats.currency = tx.currency || 'USD';
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting hotel statistics:', error);
      throw error;
    }
  }
}

module.exports = new TransactionRepository();
