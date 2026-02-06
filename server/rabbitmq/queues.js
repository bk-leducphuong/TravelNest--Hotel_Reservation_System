const logger = require('@config/logger.config');

/**
 * Queue definitions for RabbitMQ
 */
const QUEUES = {
  // Image processing
  imageProcessing: 'image.processing',
  imageProcessingRetry: 'image.processing.retry',
  imageProcessingDlq: 'image.processing.dlq',

  // Hotel search snapshot
  hotelSearchSnapshot: 'hotel-search-snapshot-events',
  hotelSearchSnapshotRetry: 'hotel-search-snapshot-events.retry',
  hotelSearchSnapshotDlq: 'hotel-search-snapshot-events.dlq',
};

/**
 * Get queue names for a base queue (main, retry, dlq)
 * @param {string} baseQueue - Base queue name
 * @returns {object} - Object with main, retry, and dlq queue names
 */
function queuesFor(baseQueue) {
  return {
    main: baseQueue,
    retry: `${baseQueue}.retry`,
    dlq: `${baseQueue}.dlq`,
  };
}

/**
 * Get queue name by key
 * @param {string} queueKey - Queue key from QUEUES object
 * @returns {string} - Queue name
 */
function queueFor(queueKey) {
  const queue = QUEUES[queueKey];
  if (!queue) {
    logger.error(`Unknown queue: ${queueKey}`);
    throw new Error(`Unknown queue: ${queueKey}`);
  }
  return queue;
}

module.exports = { QUEUES, queuesFor, queueFor };
