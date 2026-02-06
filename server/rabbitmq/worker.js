require('module-alias/register');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const logger = require('@config/logger.config');
const { connectionManager } = require('@rabbitmq/index');
const {
  imageProcessingConsumer,
  hotelSearchSnapshotConsumer,
} = require('@rabbitmq/workers/index');

/**
 * RabbitMQ worker process.
 * Runs background consumers for image processing and other tasks.
 */
async function main() {
  const consumers = [];

  // Add image processing consumer
  consumers.push(imageProcessingConsumer);

  // Add hotel search snapshot consumer
  consumers.push(hotelSearchSnapshotConsumer);

  // Start all consumers
  await Promise.all(consumers.map((c) => c.start()));
  logger.info('RabbitMQ worker started with consumers', {
    consumerCount: consumers.length,
    queues: consumers.map((c) => c.queues),
  });

  const shutdown = async (reason) => {
    try {
      logger.info({ reason }, 'RabbitMQ worker shutting down');
      
      // Stop all consumers
      await Promise.allSettled(consumers.map((c) => c.stop()));
      
      // Close connection
      await connectionManager.close();
      
      logger.info('RabbitMQ worker shutdown complete');
    } finally {
      process.exit(0);
    }
  };

  ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach((sig) => {
    process.once(sig, () => shutdown(sig));
  });
  
  ['unhandledRejection', 'uncaughtException'].forEach((evt) => {
    process.on(evt, (err) => {
      logger.error({ err }, `Process error: ${evt}`);
      shutdown(evt);
    });
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
