const connectionManager = require('@rabbitmq/connection');
const logger = require('@config/logger.config');
const config = require('@config/rabbitmq.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Ensure queue exists with proper configuration
 * @param {Channel} channel - RabbitMQ channel
 * @param {string} queue - Queue name
 */
async function ensureQueue(channel, queue) {
  await channel.assertQueue(queue, {
    durable: config.queueOptions.durable,
    arguments: {
      'x-queue-type': 'classic',
    },
  });
}

/**
 * Publish a message to a RabbitMQ queue with priority support
 * @param {string} queue - The queue name
 * @param {object} message - The message payload
 * @param {number} priority - Message priority (0-10, higher number = higher priority)
 * @param {string} messageId - Optional message ID for idempotency
 * @returns {Promise<void>}
 */
async function publishToQueue(queue, message, priority = 5, messageId = null) {
  let channel = null;

  try {
    // Get or create channel
    channel = await connectionManager.getChannel('publisher');

    // Ensure queue exists
    await ensureQueue(channel, queue);

    const msgId = messageId || uuidv4();
    const timestamp = Date.now();

    // Prepare message
    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Publish message
    const sent = channel.sendToQueue(queue, messageBuffer, {
      persistent: config.publishOptions.persistent,
      priority: Math.min(Math.max(priority, 0), 10), // Clamp between 0-10
      messageId: msgId,
      timestamp,
      contentType: 'application/json',
      headers: {
        priority: priority.toString(),
        timestamp: timestamp.toString(),
      },
    });

    if (!sent) {
      // Queue is full, wait for drain event
      await new Promise((resolve) => channel.once('drain', resolve));
    }

    logger.info(`Message published to queue: ${queue}`, {
      messageId: message.imageId || message.id || msgId,
      priority,
    });
  } catch (error) {
    logger.error('Error publishing to RabbitMQ queue:', error);
    throw new Error(`Failed to publish message to queue: ${error.message}`);
  }
}

/**
 * Publish multiple messages in batch
 * @param {string} queue - The queue name
 * @param {Array<object>} messages - Array of message payloads
 * @param {number} priority - Message priority
 * @returns {Promise<void>}
 */
async function publishBatchToQueue(queue, messages, priority = 5) {
  let channel = null;

  try {
    // Get or create channel
    channel = await connectionManager.getChannel('publisher');

    // Ensure queue exists
    await ensureQueue(channel, queue);

    const timestamp = Date.now();

    // Publish all messages
    for (const message of messages) {
      const msgId = uuidv4();
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sent = channel.sendToQueue(queue, messageBuffer, {
        persistent: config.publishOptions.persistent,
        priority: Math.min(Math.max(priority, 0), 10),
        messageId: msgId,
        timestamp,
        contentType: 'application/json',
        headers: {
          priority: priority.toString(),
          timestamp: timestamp.toString(),
        },
      });

      if (!sent) {
        // Queue is full, wait for drain event
        await new Promise((resolve) => channel.once('drain', resolve));
      }
    }

    logger.info(`Batch of ${messages.length} messages published to queue: ${queue}`);
  } catch (error) {
    logger.error('Error publishing batch to RabbitMQ queue:', error);
    throw new Error(`Failed to publish batch to queue: ${error.message}`);
  }
}

/**
 * Initialize publisher (ensure connection is ready)
 */
async function initPublisher() {
  try {
    await connectionManager.connect();
    await connectionManager.getChannel('publisher');
    logger.info('RabbitMQ publisher initialized');
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ publisher:', error);
    throw error;
  }
}

/**
 * Gracefully disconnect the publisher
 */
async function disconnectPublisher() {
  try {
    await connectionManager.closeChannel('publisher');
    logger.info('RabbitMQ publisher disconnected');
  } catch (error) {
    logger.error('Error disconnecting publisher:', error);
  }
}

module.exports = {
  initPublisher,
  publishToQueue,
  publishBatchToQueue,
  disconnectPublisher,
  ensureQueue,
};
