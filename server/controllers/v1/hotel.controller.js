const hotelService = require('@services/hotel.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');
const { computeNumberOfNights } = require('@helpers/hotel.helpers');
const hotelViewEventService = require('@services/hotelViewEvent.service');
const {
  getAuthenticatedUserId,
  getTrackingSessionId,
} = require('@helpers/auth-context.helper');

/**
 * GET /api/hotels/:hotelId
 * Get hotel details with rooms, reviews, nearby places, and review criteria
 */
const getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { checkInDate, checkOutDate, numberOfRooms, numberOfGuests } = req.query;

  const numberOfNights = computeNumberOfNights(checkInDate, checkOutDate);

  const options = {
    checkInDate,
    checkOutDate,
    numberOfNights,
    numberOfRooms: numberOfRooms ? parseInt(numberOfRooms, 10) : undefined,
    numberOfGuests: numberOfGuests ? parseInt(numberOfGuests, 10) : undefined,
  };

  const result = await hotelService.getHotelDetails(hotelId, options);

  // Emit view event asynchronously (deduped via Redis)
  const userId = getAuthenticatedUserId(req);
  const sessionId = getTrackingSessionId(req) || '';
  const ipAddress =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    '';
  const userAgent = req.get('user-agent') || '';

  hotelViewEventService
    .publishHotelViewEvent({ hotelId, userId, sessionId, ipAddress, userAgent })
    .catch((err) => logger.error({ err: err.message }, 'Failed to publish hotel view event'));

  // Track "recently viewed" for authenticated users (Redis)
  if (userId) {
    hotelService
      .recordRecentlyViewedHotel(userId, hotelId)
      .catch((err) => logger.error({ err: err.message }, 'Failed to record recently viewed hotel'));
  }

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/hotels/:hotelId/rooms
 * Search available rooms for a hotel
 */
const searchRooms = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { checkInDate, checkOutDate, numberOfRooms, numberOfGuests, page, limit } = req.query;

  const numberOfNights = computeNumberOfNights(checkInDate, checkOutDate);

  const searchParams = {
    checkInDate,
    checkOutDate,
    numberOfNights,
    numberOfRooms: numberOfRooms ? parseInt(numberOfRooms, 10) : 1,
    numberOfGuests: numberOfGuests ? parseInt(numberOfGuests, 10) : undefined,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  };

  const result = await hotelService.searchRooms(hotelId, searchParams);

  res.status(200).json({
    data: result.rooms,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

const getHotelPolicies = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const policies = await hotelService.getHotelPolicies(hotelId);
  res.status(200).json({ data: policies });
});

/**
 * GET /api/hotels/:hotelId/nearby-places
 * Get nearby places for a hotel
 */
const getNearbyPlaces = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { category, limit } = req.query;

  const places = await hotelService.getNearbyPlaces(hotelId, {
    category,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  res.status(200).json({ data: places });
});

/**
 * GET /api/v1/hotels/recently-viewed
 * Get recently viewed hotels (authenticated, from Redis)
 */
const getRecentlyViewedHotels = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.query;

  const hotels = await hotelService.getRecentlyViewedHotels(
    userId,
    limit ? parseInt(limit, 10) : 10
  );

  res.status(200).json({ data: hotels });
});

/**
 * GET /api/v1/hotels/trending
 * Get trending hotels (public, from analytics service)
 */
const getTrendingHotels = asyncHandler(async (req, res) => {
  const { limit, days } = req.query;

  const hotels = await hotelService.getTrendingHotels({
    limit: limit ? parseInt(limit, 10) : 10,
    days: days ? parseInt(days, 10) : 2,
  });

  res.status(200).json({ data: hotels });
});

/**
 * POST /api/v1/hotels/batch
 * Get enriched hotel cards for a list of hotel IDs (public).
 */
const getHotelsByIds = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(200).json({ data: [] });
  }

  const hotels = await hotelService.getHotelsByIds(ids.slice(0, 50));
  res.status(200).json({ data: hotels });
});

module.exports = {
  getHotelDetails,
  searchRooms,
  getHotelPolicies,
  getNearbyPlaces,
  getRecentlyViewedHotels,
  getTrendingHotels,
  getHotelsByIds,
};
