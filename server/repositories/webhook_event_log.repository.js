const { webhook_event_logs: WebhookEventLog } = require('@models/index');
const logger = require('@config/logger.config');

/**
 * Webhook Event Log Repository
 * Handles webhook event logging for idempotency
 */
class WebhookEventLogRepository {
  /**
   * Find event by event ID
   */
  async findByEventId(eventId) {
    try {
      return await WebhookEventLog.findOne({
        where: { event_id: eventId },
      });
    } catch (error) {
      logger.error('Error finding webhook event:', error);
      throw error;
    }
  }

  /**
   * Create webhook event log
   */
  async create(data) {
    try {
      return await WebhookEventLog.create({
        event_id: data.eventId,
        event_type: data.eventType,
        provider: data.provider,
        payload: data.payload,
        processed_at: data.processedAt || new Date(),
        status: data.status || 'processed',
        error_message: data.errorMessage || null,
      });
    } catch (error) {
      logger.error('Error creating webhook event log:', error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateStatus(eventId, status, errorMessage = null) {
    try {
      return await WebhookEventLog.update(
        {
          status,
          error_message: errorMessage,
        },
        {
          where: { event_id: eventId },
        }
      );
    } catch (error) {
      logger.error('Error updating webhook event status:', error);
      throw error;
    }
  }

  /**
   * Get recent events for debugging
   */
  async getRecentEvents(limit = 50) {
    try {
      return await WebhookEventLog.findAll({
        order: [['processed_at', 'DESC']],
        limit,
      });
    } catch (error) {
      logger.error('Error getting recent webhook events:', error);
      throw error;
    }
  }
}

module.exports = new WebhookEventLogRepository();
