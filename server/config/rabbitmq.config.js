require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const config = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  // Connection options
  socketOptions: {
    heartbeatIntervalInSeconds: 30,
    reconnectTimeInSeconds: 10,
  },
  // Queue options
  queueOptions: {
    durable: true, // Queues survive broker restart
  },
  // Consumer options
  consumerOptions: {
    noAck: false, // Manual acknowledgment
  },
  // Publisher options
  publishOptions: {
    persistent: true, // Messages survive broker restart
  },
  // Retry configuration
  retry: {
    maxRetries: 5,
    delayMs: 60000, // 1 minute
  },
};

module.exports = config;
