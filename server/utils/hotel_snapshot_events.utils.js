const { publishToQueue } = require('@utils/rabbitmq.utils');
const { queueFor } = require('@rabbitmq/queues');
const logger = require('@config/logger.config');

const QUEUE = queueFor('hotelSearchSnapshot');

/**
 * Emit hotel.created event
 */
const emitHotelCreated = async (hotelId, hotelData) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'hotel.created',
      hotelId,
      hotelData: {
        name: hotelData.name,
        city: hotelData.city,
        country: hotelData.country,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        hotel_class: hotelData.hotel_class,
        status: hotelData.status,
      },
      timestamp: new Date().toISOString(),
    },
    5, // priority
    hotelId // messageId for idempotency
  );

  logger.info(`[Event] Emitted hotel.created for hotel ${hotelId}`);
};

/**
 * Emit hotel.updated event
 */
const emitHotelUpdated = async (hotelId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'hotel.updated',
      hotelId,
      timestamp: new Date().toISOString(),
    },
    5,
    hotelId
  );

  logger.info(`[Event] Emitted hotel.updated for hotel ${hotelId}`);
};

/**
 * Emit room_inventory.changed event
 */
const emitRoomInventoryChanged = async (hotelId, roomId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'room_inventory.changed',
      hotelId,
      roomId,
      timestamp: new Date().toISOString(),
    },
    5,
    hotelId
  );

  logger.info(`[Event] Emitted room_inventory.changed for hotel ${hotelId}`);
};

/**
 * Emit review.created event
 */
const emitReviewCreated = async (hotelId, reviewId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'review.created',
      hotelId,
      reviewId,
      timestamp: new Date().toISOString(),
    },
    5,
    hotelId
  );

  logger.info(`[Event] Emitted review.created for hotel ${hotelId}`);
};

/**
 * Emit amenity.changed event
 */
const emitAmenityChanged = async (hotelId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'amenity.changed',
      hotelId,
      timestamp: new Date().toISOString(),
    },
    5,
    hotelId
  );

  logger.info(`[Event] Emitted amenity.changed for hotel ${hotelId}`);
};

/**
 * Emit booking.completed event
 */
const emitBookingCompleted = async (hotelId, bookingId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'booking.completed',
      hotelId,
      bookingId,
      timestamp: new Date().toISOString(),
    },
    5,
    hotelId
  );

  logger.info(`[Event] Emitted booking.completed for hotel ${hotelId}`);
};

/**
 * Emit hotel.viewed event
 */
const emitHotelViewed = async (hotelId, userId = null) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'hotel.viewed',
      hotelId,
      userId,
      timestamp: new Date().toISOString(),
    },
    3, // Lower priority for view events
    hotelId
  );

  // Note: Don't log this to avoid spam, as views can be frequent
};

/**
 * Emit snapshot.full_refresh event
 */
const emitFullRefresh = async (hotelId) => {
  await publishToQueue(
    QUEUE,
    {
      eventType: 'snapshot.full_refresh',
      hotelId,
      timestamp: new Date().toISOString(),
    },
    8, // High priority for full refresh
    hotelId
  );

  logger.info(`[Event] Emitted snapshot.full_refresh for hotel ${hotelId}`);
};

module.exports = {
  emitHotelCreated,
  emitHotelUpdated,
  emitRoomInventoryChanged,
  emitReviewCreated,
  emitAmenityChanged,
  emitBookingCompleted,
  emitHotelViewed,
  emitFullRefresh,
};
