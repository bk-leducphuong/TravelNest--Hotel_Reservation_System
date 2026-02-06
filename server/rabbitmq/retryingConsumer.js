const connectionManager = require('./connection');
const logger = require('@config/logger.config');
const config = require('@config/rabbitmq.config');
const { queuesFor } = require('./queues');
const { sleep } = require('./utils/sleep.util');
const { ensureQueue } = require('@utils/rabbitmq.utils');

/**
 * Parse JSON message safely
 */
function safeJsonParse(value) {
  if (value == null) return null;
  const s = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  try {
    return JSON.parse(s);
  } catch (err) {
    logger.error('Failed to parse JSON message:', err);
    return null;
  }
}

/**
 * Convert error to string
 */
function errorToString(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.stack || err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Create a RabbitMQ consumer with retry and DLQ support
 * 
 * Features:
 * - Main queue processing
 * - Automatic retry with exponential backoff
 * - Dead-letter queue for failed messages
 * - Manual acknowledgment
 * 
 * @param {object} options - Consumer configuration
 * @param {string} options.baseQueue - Base queue name
 * @param {string} options.consumerTag - Consumer identifier
 * @param {function} options.handler - Message handler function
 * @param {object} options.retry - Retry configuration
 * @param {number} options.retry.maxRetries - Maximum retry attempts
 * @param {number} options.retry.delayMs - Delay between retries (ms)
 * @param {string} options.channelName - Channel name for this consumer
 * @returns {object} - Consumer control object
 */
function createRetryingConsumer({
  baseQueue,
  consumerTag,
  handler,
  retry = {},
  channelName = 'consumer',
}) {
  const { main, retry: retryQueue, dlq: dlqQueue } = queuesFor(baseQueue);

  const maxRetries =
    typeof retry.maxRetries === 'number' ? retry.maxRetries : config.retry.maxRetries;
  const delayMs =
    typeof retry.delayMs === 'number' ? retry.delayMs : config.retry.delayMs;

  let channel = null;
  let isConsuming = false;
  let consumerTags = [];

  /**
   * Setup queues with proper configuration
   */
  async function setupQueues() {
    // Main queue
    await ensureQueue(channel, main);

    // Retry queue with TTL (time to live)
    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': delayMs, // Messages expire after delay
        'x-dead-letter-exchange': '', // Use default exchange
        'x-dead-letter-routing-key': main, // Route back to main queue
      },
    });

    // Dead-letter queue (no TTL, messages stay here)
    await ensureQueue(channel, dlqQueue);

    logger.info('Queues setup completed', { main, retryQueue, dlqQueue });
  }

  /**
   * Publish message to retry or DLQ
   */
  async function publishToRetryOrDlq(targetQueue, message, properties, retryCount, err) {
    const newProperties = {
      ...properties,
      persistent: true,
      headers: {
        ...(properties.headers || {}),
        'x-retry-count': retryCount,
        'x-original-queue': baseQueue,
      },
    };

    if (targetQueue === dlqQueue) {
      newProperties.headers['x-error'] = errorToString(err);
      newProperties.headers['x-failed-at'] = Date.now().toString();
    }

    channel.sendToQueue(targetQueue, message.content, newProperties);
  }

  /**
   * Process a single message
   */
  async function processMessage(message) {
    if (!message) return;

    const headers = message.properties.headers || {};
    const retryCount = headers['x-retry-count'] || 0;

    try {
      const value = safeJsonParse(message.content);

      if (!value) {
        logger.error('Failed to parse message, sending to DLQ', {
          queue: main,
          retryCount,
        });
        // Invalid message, send to DLQ immediately
        await publishToRetryOrDlq(
          dlqQueue,
          message,
          message.properties,
          retryCount + 1,
          new Error('Invalid JSON message')
        );
        channel.ack(message);
        return;
      }

      // Call handler
      await handler({
        queue: message.fields.routingKey,
        value,
        headers,
        properties: message.properties,
        rawMessage: message,
      });

      // Acknowledge message on success
      channel.ack(message);
      
      logger.debug('Message processed successfully', {
        queue: main,
        messageId: message.properties.messageId,
      });
    } catch (err) {
      const nextRetryCount = retryCount + 1;

      if (nextRetryCount <= maxRetries) {
        // Retry the message
        await publishToRetryOrDlq(
          retryQueue,
          message,
          message.properties,
          nextRetryCount,
          err
        );

        logger.warn('Message failed, queued for retry', {
          baseQueue,
          queue: main,
          nextRetryCount,
          maxRetries,
          error: err.message,
        });
      } else {
        // Max retries exceeded, send to DLQ
        await publishToRetryOrDlq(
          dlqQueue,
          message,
          message.properties,
          nextRetryCount,
          err
        );

        logger.error('Message failed, sent to DLQ', {
          baseQueue,
          queue: main,
          retryCount: nextRetryCount,
          maxRetries,
          error: err.message,
        });
      }

      // Acknowledge the original message (it's been re-queued or sent to DLQ)
      channel.ack(message);
    }
  }

  /**
   * Start consuming messages
   */
  async function start() {
    if (isConsuming) {
      logger.warn('Consumer already started', { consumerTag });
      return;
    }

    try {
      // Get channel
      channel = await connectionManager.getChannel(channelName);

      // Setup queues
      await setupQueues();

      // Start consuming from main queue
      const mainConsumer = await channel.consume(
        main,
        processMessage,
        {
          noAck: false, // Manual acknowledgment
          consumerTag: `${consumerTag}-main`,
        }
      );
      consumerTags.push(mainConsumer.consumerTag);

      isConsuming = true;

      logger.info('RabbitMQ consumer started', {
        consumerTag,
        main,
        retryQueue,
        dlqQueue,
        maxRetries,
        delayMs,
      });
    } catch (error) {
      logger.error('Failed to start consumer:', error);
      throw error;
    }
  }

  /**
   * Stop consuming messages
   */
  async function stop() {
    if (!isConsuming) {
      return;
    }

    try {
      // Cancel all consumers
      for (const tag of consumerTags) {
        await channel.cancel(tag);
        logger.info(`Consumer cancelled: ${tag}`);
      }

      consumerTags = [];
      isConsuming = false;

      logger.info('RabbitMQ consumer stopped', { consumerTag });
    } catch (error) {
      logger.error('Error stopping consumer:', error);
      throw error;
    }
  }

  return {
    start,
    stop,
    queues: { main, retry: retryQueue, dlq: dlqQueue },
    isConsuming: () => isConsuming,
  };
}

module.exports = { createRetryingConsumer };
