/**
 * Payment Provider Interface
 * 
 * This interface defines the contract that all payment providers must implement.
 * This allows us to easily swap between Stripe, PayPal, etc. without changing business logic.
 */

class PaymentProviderInterface {
  /**
   * Create a payment intent/order
   * @param {Object} params
   * @param {number} params.amount - Amount in smallest currency unit (e.g., cents)
   * @param {string} params.currency - Currency code (e.g., 'usd')
   * @param {string} params.paymentMethodId - Payment method identifier
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} { id, clientSecret, status }
   */
  async createPayment(params) {
    throw new Error('Method createPayment() must be implemented');
  }

  /**
   * Retrieve payment details
   * @param {string} paymentId - Payment intent/order ID
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    throw new Error('Method getPayment() must be implemented');
  }

  /**
   * Cancel a payment
   * @param {string} paymentId - Payment intent/order ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(paymentId) {
    throw new Error('Method cancelPayment() must be implemented');
  }

  /**
   * Create a refund
   * @param {Object} params
   * @param {string} params.paymentId - Original payment ID
   * @param {number} params.amount - Amount to refund (optional, full refund if not specified)
   * @param {string} params.reason - Refund reason
   * @returns {Promise<Object>} Refund details
   */
  async refundPayment(params) {
    throw new Error('Method refundPayment() must be implemented');
  }

  /**
   * Verify webhook signature
   * @param {string|Buffer} payload - Raw webhook payload
   * @param {string} signature - Signature from webhook headers
   * @returns {Object} Parsed and verified event
   */
  verifyWebhook(payload, signature) {
    throw new Error('Method verifyWebhook() must be implemented');
  }

  /**
   * Get provider name
   * @returns {string} Provider identifier (e.g., 'stripe', 'paypal')
   */
  getProviderName() {
    throw new Error('Method getProviderName() must be implemented');
  }
}

module.exports = PaymentProviderInterface;
