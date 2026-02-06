const snapshotRepo = require('@repositories/hotel_search_snapshot.repository');
const logger = require('@config/logger.config');
const elasticsearchClient = require('@config/elasticsearch.config');
const { queueFor } = require('@rabbitmq/queues');

/**
 * Hotel Search Snapshot RabbitMQ Worker
 *
 * Processes events to update hotel search snapshots and sync to Elasticsearch
 *
 * Event Types:
 * - hotel.created: Create initial empty snapshot
 * - hotel.updated: Update basic hotel info
 * - room_inventory.changed: Recompute pricing and availability
 * - review.created: Update rating and review count
 * - amenity.changed: Update amenity codes
 * - booking.completed: Increment booking count
 * - hotel.viewed: Increment view count
 */

const QUEUE = queueFor('hotelSearchSnapshot');
const MAX_ELASTICSEARCH_RETRIES = 5;

/**
 * Sync snapshot to Elasticsearch with retry logic
 */
const syncToElasticsearch = async (hotelId, snapshotData, retryCount = 0) => {
  try {
    await elasticsearchClient.index({
      index: 'hotels',
      id: hotelId,
      document: snapshotData,
    });

    logger.info(
      `[ES Sync] Successfully synced hotel ${hotelId} to Elasticsearch`
    );
    return true;
  } catch (error) {
    logger.error(
      `[ES Sync] Failed to sync hotel ${hotelId} to Elasticsearch (attempt ${retryCount + 1}):`,
      error.message
    );

    if (retryCount < MAX_ELASTICSEARCH_RETRIES) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return syncToElasticsearch(hotelId, snapshotData, retryCount + 1);
    }

    // TODO: If all retries fail, add to dead letter queue for manual intervention
    logger.error(
      `[ES Sync] Max retries exceeded for hotel ${hotelId}. Adding to DLQ.`
    );
    return false;
  }
};

/**
 * Handle hotel.created event
 * Create empty snapshot with is_available = false
 */
const handleHotelCreated = async (payload) => {
  const { hotelId, hotelData } = payload;

  logger.info(`[Worker] Creating initial snapshot for hotel ${hotelId}`);

  const snapshot = await snapshotRepo.createInitialSnapshot(hotelId, hotelData);

  // Sync to Elasticsearch
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle hotel.updated event
 * Update basic hotel information
 */
const handleHotelUpdated = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Updating basic info for hotel ${hotelId}`);

  const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);
  await snapshotRepo.partialUpdate(hotelId, basicInfo);

  const snapshot = await snapshotRepo.getByHotelId(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle room_inventory.changed event
 * Recompute pricing and availability
 */
const handleRoomInventoryChanged = async (payload) => {
  const { hotelId } = payload;

  logger.info(
    `[Worker] Recomputing pricing and availability for hotel ${hotelId}`
  );

  const pricingData = await snapshotRepo.recomputePricing(hotelId);
  const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);

  await snapshotRepo.partialUpdate(hotelId, {
    ...pricingData,
    is_available:
      pricingData.has_available_rooms && basicInfo.status === 'active',
  });

  const snapshot = await snapshotRepo.getByHotelId(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle review.created event
 * Update rating and review count from rating summary
 */
const handleReviewCreated = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Updating rating for hotel ${hotelId}`);

  const ratingData = await snapshotRepo.recomputeRating(hotelId);
  await snapshotRepo.partialUpdate(hotelId, ratingData);

  const snapshot = await snapshotRepo.getByHotelId(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle amenity.changed event
 * Update amenity codes (pure overwrite)
 */
const handleAmenityChanged = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Updating amenities for hotel ${hotelId}`);

  const amenityData = await snapshotRepo.recomputeAmenities(hotelId);
  await snapshotRepo.partialUpdate(hotelId, amenityData);

  const snapshot = await snapshotRepo.getByHotelId(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle booking.completed event
 * Check availability and increment booking count
 */
const handleBookingCompleted = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Processing booking completion for hotel ${hotelId}`);

  // Increment booking count
  await snapshotRepo.incrementBookingCount(hotelId);

  // Re-check availability (don't recompute per-date, just the boolean)
  const pricingData = await snapshotRepo.recomputePricing(hotelId);
  const basicInfo = await snapshotRepo.getHotelBasicInfo(hotelId);

  await snapshotRepo.partialUpdate(hotelId, {
    is_available:
      pricingData.has_available_rooms && basicInfo.status === 'active',
    has_available_rooms: pricingData.has_available_rooms,
  });

  const snapshot = await snapshotRepo.getByHotelId(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Handle hotel.viewed event
 * Increment view count for popularity scoring
 */
const handleHotelViewed = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Incrementing view count for hotel ${hotelId}`);

  await snapshotRepo.incrementViewCount(hotelId);

  // Note: We don't sync to ES for every view to reduce load
  // Views can be synced in batch or during other updates

  return { success: true, hotelId };
};

/**
 * Handle full refresh event
 * Recompute everything from scratch
 */
const handleFullRefresh = async (payload) => {
  const { hotelId } = payload;

  logger.info(`[Worker] Full refresh for hotel ${hotelId}`);

  const snapshot = await snapshotRepo.fullRefresh(hotelId);
  await syncToElasticsearch(hotelId, snapshot.toJSON());

  return { success: true, hotelId };
};

/**
 * Main message processor
 */
const processMessage = async (payload) => {
  try {
    const eventType = payload.eventType;

    logger.info(`[Worker] Processing event: ${eventType}`, payload);

    let result;

    switch (eventType) {
      case 'hotel.created':
        result = await handleHotelCreated(payload);
        break;

      case 'hotel.updated':
        result = await handleHotelUpdated(payload);
        break;

      case 'room_inventory.changed':
        result = await handleRoomInventoryChanged(payload);
        break;

      case 'review.created':
        result = await handleReviewCreated(payload);
        break;

      case 'amenity.changed':
        result = await handleAmenityChanged(payload);
        break;

      case 'booking.completed':
        result = await handleBookingCompleted(payload);
        break;

      case 'hotel.viewed':
        result = await handleHotelViewed(payload);
        break;

      case 'snapshot.full_refresh':
        result = await handleFullRefresh(payload);
        break;

      default:
        logger.warn(`[Worker] Unknown event type: ${eventType}`);
        return { success: false, error: 'Unknown event type' };
    }

    logger.info(`Successfully processed ${eventType}:`, result);
    return result;
  } catch (error) {
    logger.error('Error processing message:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * RabbitMQ consumer for hotel search snapshot updates
 * Subscribes to 'hotel-search-snapshot-events' queue
 */
const { createRetryingConsumer } = require('../retryingConsumer');

const hotelSearchSnapshotConsumer = createRetryingConsumer({
  baseQueue: QUEUE,
  consumerTag:
    process.env.RABBITMQ_HOTEL_SNAPSHOT_CONSUMER ||
    'hotel-search-snapshot-consumer',
  retry: {
    maxRetries: Number(process.env.RABBITMQ_HOTEL_SNAPSHOT_MAX_RETRIES || 5),
    delayMs: Number(process.env.RABBITMQ_HOTEL_SNAPSHOT_RETRY_DELAY_MS || 30_000),
  },
  channelName: 'hotel-snapshot',
  handler: async ({ value, headers, properties, queue }) => {
    if (!value) {
      logger.error('Empty message received', { queue });
      throw new Error('Empty message');
    }

    logger.info('Processing hotel snapshot event from RabbitMQ', {
      eventType: value.eventType,
      hotelId: value.hotelId,
      queue,
      messageId: properties.messageId,
    });

    await processMessage(value);
  },
});

module.exports = { hotelSearchSnapshotConsumer };
