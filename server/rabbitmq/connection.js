const amqp = require('amqplib');
const logger = require('@config/logger.config');
const config = require('@config/rabbitmq.config');

/**
 * RabbitMQ Connection Manager
 * Manages a single connection and multiple channels
 */
class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channels = new Map();
    this.isConnecting = false;
  }

  /**
   * Establish connection to RabbitMQ
   */
  async connect() {
    if (this.connection) {
      return this.connection;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.connection;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ...', { url: config.url });

      this.connection = await amqp.connect(config.url, {
        heartbeat: config.socketOptions.heartbeatIntervalInSeconds,
      });

      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        this.connection = null;
        this.channels.clear();

        // Attempt to reconnect
        setTimeout(() => {
          this.connect().catch((err) => {
            logger.error('Failed to reconnect to RabbitMQ:', err);
          });
        }, config.socketOptions.reconnectTimeInSeconds * 1000);
      });

      logger.info('Successfully connected to RabbitMQ');
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Get or create a channel
   * @param {string} name - Channel name for identification
   * @returns {Promise<Channel>}
   */
  async getChannel(name = 'default') {
    if (this.channels.has(name)) {
      return this.channels.get(name);
    }

    if (!this.connection) {
      await this.connect();
    }

    try {
      const channel = await this.connection.createChannel();

      // Handle channel events
      channel.on('error', (err) => {
        logger.error(`RabbitMQ channel error (${name}):`, err);
        this.channels.delete(name);
      });

      channel.on('close', () => {
        logger.warn(`RabbitMQ channel closed (${name})`);
        this.channels.delete(name);
      });

      // Set prefetch for better load distribution
      await channel.prefetch(1);

      this.channels.set(name, channel);
      logger.info(`RabbitMQ channel created: ${name}`);

      return channel;
    } catch (error) {
      logger.error(`Failed to create channel (${name}):`, error);
      throw error;
    }
  }

  /**
   * Close a specific channel
   * @param {string} name - Channel name
   */
  async closeChannel(name) {
    const channel = this.channels.get(name);
    if (channel) {
      try {
        await channel.close();
        this.channels.delete(name);
        logger.info(`Channel closed: ${name}`);
      } catch (error) {
        logger.error(`Error closing channel (${name}):`, error);
      }
    }
  }

  /**
   * Close all channels and connection
   */
  async close() {
    try {
      // Close all channels
      for (const [name, channel] of this.channels.entries()) {
        try {
          await channel.close();
          logger.info(`Channel closed: ${name}`);
        } catch (error) {
          logger.error(`Error closing channel (${name}):`, error);
        }
      }
      this.channels.clear();

      // Close connection
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
        logger.info('RabbitMQ connection closed');
      }
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }

  /**
   * Check if connection is active
   */
  isConnected() {
    return this.connection !== null;
  }
}

// Export singleton instance
const connectionManager = new RabbitMQConnection();

module.exports = connectionManager;
