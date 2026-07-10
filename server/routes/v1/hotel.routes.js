const express = require('express');
const {
  getRecentlyViewedHotels,
  getTrendingHotels,
  getHotelDetails,
  searchRooms,
  getHotelPolicies,
  getNearbyPlaces,
  getHotelsByIds,
} = require('@controllers/v1/hotel.controller.js');
const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('@validators/v1/hotel.schema');
const router = express.Router();
const HOTEL_ID_ROUTE_PARAM = ':hotelId([0-9a-fA-F-]{36})';

// root route: /api/v1/hotels

/**
 * @swagger
 * /hotels/recently-viewed:
 *   get:
 *     summary: Get recently viewed hotels
 *     description: Returns a list of hotels recently viewed by the authenticated user, ordered by most recent first.
 *     tags:
 *       - Hotels
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of hotels to return
 *     responses:
 *       200:
 *         description: List of recently viewed hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       description: { type: string }
 *                       address: { type: string }
 *                       city: { type: string }
 *                       country: { type: string }
 *                       hotelClass: { type: integer, description: "Star rating 1-5" }
 *                       minPrice: { type: number, nullable: true }
 *                       images:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             url: { type: string }
 *                             isPrimary: { type: boolean }
 *                       ratingSummary:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           overallRating: { type: number }
 *                           totalReviews: { type: integer }
 *                       viewedAt: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/recently-viewed',
  authenticate,
  validate(hotelSchema.getRecentlyViewedHotels),
  getRecentlyViewedHotels
);

router.post('/batch', getHotelsByIds);

/**
 * @swagger
 * /hotels/trending:
 *   get:
 *     summary: Get trending hotels
 *     description: Returns a list of trending hotels based on booking activity within the specified number of days.
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of hotels to return
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 2
 *         description: Number of days to look back for trending data
 *     responses:
 *       200:
 *         description: List of trending hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       description: { type: string }
 *                       address: { type: string }
 *                       city: { type: string }
 *                       country: { type: string }
 *                       hotelClass: { type: integer, description: "Star rating 1-5" }
 *                       minPrice: { type: number, nullable: true }
 *                       images:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             url: { type: string }
 *                             isPrimary: { type: boolean }
 *                       ratingSummary:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           overallRating: { type: number }
 *                           totalReviews: { type: integer }
 *                       bookingCount: { type: integer, description: "Number of bookings in the period" }
 */
router.get('/trending', validate(hotelSchema.getTrendingHotels), getTrendingHotels);

/**
 * @swagger
 * /hotels/{hotelId}:
 *   get:
 *     summary: Get hotel details
 *     description: |
 *       Returns comprehensive hotel information including:
 *       - Basic hotel info (name, description, address, contact, coordinates)
 *       - Check-in/check-out times and policies
 *       - Images and amenities (grouped by category)
 *       - Rating summary and distribution
 *       - Rating breakdown by criteria (cleanliness, location, service, value)
 *       - Sample of recent reviews with user info and replies
 *       - Nearby places (restaurants, attractions, etc.)
 *       - Hotel policies (cancellation, pets, etc.)
 *       - Available rooms with pricing (only when check-in/out dates are provided)
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: query
 *         name: checkInDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-15"
 *         description: Check-in date (ISO 8601). If provided, checkOutDate is required. Number of nights is inferred from the date range.
 *       - in: query
 *         name: checkOutDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-18"
 *         description: Check-out date. Must be after checkInDate.
 *       - in: query
 *         name: numberOfRooms
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Number of rooms needed (for availability)
 *       - in: query
 *         name: numberOfGuests
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of guests (filters rooms by capacity)
 *     responses:
 *       200:
 *         description: Hotel details with all related data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         name: { type: string }
 *                         description: { type: string }
 *                         address: { type: string }
 *                         city: { type: string }
 *                         country: { type: string }
 *                         phoneNumber: { type: string }
 *                         latitude: { type: number }
 *                         longitude: { type: number }
 *                         hotelClass: { type: integer, description: "Star rating 1-5" }
 *                         minPrice: { type: number, nullable: true }
 *                         status: { type: string }
 *                         timezone: { type: string }
 *                     checkInOut:
 *                       type: object
 *                       properties:
 *                         checkInTime: { type: string }
 *                         checkOutTime: { type: string }
 *                         checkInPolicy: { type: string, nullable: true }
 *                         checkOutPolicy: { type: string, nullable: true }
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           url: { type: string }
 *                           filename: { type: string }
 *                           width: { type: integer }
 *                           height: { type: integer }
 *                           isPrimary: { type: boolean }
 *                           displayOrder: { type: integer }
 *                     amenities:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             code: { type: string }
 *                             name: { type: string }
 *                             icon: { type: string, nullable: true }
 *                     ratingSummary:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         overallRating: { type: number }
 *                         totalReviews: { type: integer }
 *                         ratingDistribution:
 *                           type: object
 *                           properties:
 *                             rating_10: { type: integer }
 *                             rating_9: { type: integer }
 *                             rating_8: { type: integer }
 *                             rating_7: { type: integer }
 *                             rating_6: { type: integer }
 *                             rating_5: { type: integer }
 *                             rating_4: { type: integer }
 *                             rating_3: { type: integer }
 *                             rating_2: { type: integer }
 *                             rating_1: { type: integer }
 *                         lastReviewDate: { type: string, format: date-time, nullable: true }
 *                     ratingBreakdown:
 *                       type: object
 *                       properties:
 *                         cleanliness: { type: string, nullable: true }
 *                         location: { type: string, nullable: true }
 *                         service: { type: string, nullable: true }
 *                         valueForMoney: { type: string, nullable: true }
 *                         overall: { type: string, nullable: true }
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           ratingOverall: { type: number }
 *                           title: { type: string, nullable: true }
 *                           comment: { type: string, nullable: true }
 *                           isVerified: { type: boolean }
 *                           helpfulCount: { type: integer }
 *                           createdAt: { type: string, format: date-time }
 *                           user: { type: object, nullable: true }
 *                           reply: { type: object, nullable: true }
 *                           media: { type: array }
 *                     nearbyPlaces:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           category: { type: string }
 *                           distanceKm: { type: number }
 *                           travelTimeMinutes: { type: integer, nullable: true }
 *                           travelMode: { type: string, nullable: true }
 *                           rating: { type: number, nullable: true }
 *                     policies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           policyType: { type: string }
 *                           title: { type: string }
 *                           description: { type: string }
 *                           icon: { type: string, nullable: true }
 *                     rooms:
 *                       type: array
 *                       description: "Populated only when checkInDate, checkOutDate, and numberOfRooms are provided (numberOfNights inferred from dates)"
 *                       items:
 *                         type: object
 *                         properties:
 *                           roomId: { type: string }
 *                           roomName: { type: string }
 *                           maxGuests: { type: integer }
 *                           pricePerNight: { type: number }
 *                           availableRooms: { type: integer }
 *                           totalPrice: { type: number, nullable: true }
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalReviews: { type: integer }
 *                         hasSearchParams: { type: boolean }
 *                         searchParams: { type: object, nullable: true }
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error (e.g. date logic)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  `/${HOTEL_ID_ROUTE_PARAM}`,
  optionalAuthenticate,
  validate(hotelSchema.getHotelDetails),
  getHotelDetails
);

/**
 * @swagger
 * /hotels/{hotelId}/policies:
 *   get:
 *     summary: Get hotel policies
 *     description: Returns all active policies for a hotel (cancellation, children, pets, payment, smoking, etc.).
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *     responses:
 *       200:
 *         description: List of hotel policies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       policyType: { type: string }
 *                       title: { type: string }
 *                       description: { type: string }
 *                       displayOrder: { type: integer }
 *                       icon: { type: string, nullable: true }
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(`/${HOTEL_ID_ROUTE_PARAM}/policies`, validate(hotelSchema.getHotelPolicies), getHotelPolicies);

/**
 * @swagger
 * /hotels/{hotelId}/nearby-places:
 *   get:
 *     summary: Get nearby places
 *     description: Returns places near the hotel (restaurants, attractions, transport, etc.) with distance and travel time.
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum:
 *             - restaurant
 *             - cafe
 *             - bar
 *             - shopping
 *             - attraction
 *             - museum
 *             - park
 *             - beach
 *             - airport
 *             - train_station
 *             - bus_station
 *             - hospital
 *             - pharmacy
 *             - bank
 *             - atm
 *             - gas_station
 *             - parking
 *             - gym
 *             - spa
 *             - entertainment
 *             - landmark
 *             - religious
 *             - school
 *             - other
 *         description: Filter by place category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of places to return
 *     responses:
 *       200:
 *         description: List of nearby places
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       category: { type: string }
 *                       description: { type: string, nullable: true }
 *                       address: { type: string, nullable: true }
 *                       latitude: { type: number }
 *                       longitude: { type: number }
 *                       distanceKm: { type: number }
 *                       travelTimeMinutes: { type: integer, nullable: true }
 *                       travelMode: { type: string, nullable: true }
 *                       rating: { type: number, nullable: true }
 *                       websiteUrl: { type: string, nullable: true }
 *                       phoneNumber: { type: string, nullable: true }
 *                       openingHours: { type: string, nullable: true }
 *                       priceLevel: { type: integer, nullable: true }
 *                       icon: { type: string, nullable: true }
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  `/${HOTEL_ID_ROUTE_PARAM}/nearby-places`,
  validate(hotelSchema.getNearbyPlaces),
  getNearbyPlaces
);

/**
 * @swagger
 * /hotels/{hotelId}/rooms:
 *   get:
 *     summary: Search available rooms
 *     description: Returns available rooms for a hotel for the given date range. Number of nights is inferred from checkInDate and checkOutDate (checkOut - checkIn).
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: query
 *         name: checkInDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-15"
 *         description: Check-in date (ISO 8601)
 *       - in: query
 *         name: checkOutDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-18"
 *         description: Check-out date (must be after checkInDate)
 *       - in: query
 *         name: numberOfRooms
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Number of rooms needed
 *       - in: query
 *         name: numberOfGuests
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter rooms by minimum guest capacity
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of available rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roomId: { type: string }
 *                       roomName: { type: string }
 *                       maxGuests: { type: integer }
 *                       roomImageUrls: {}
 *                       roomAmenities: {}
 *                       pricePerNight: { type: number }
 *                       availableRooms: { type: integer }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *       404:
 *         description: Hotel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Missing or invalid date parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(`/${HOTEL_ID_ROUTE_PARAM}/rooms`, validate(hotelSchema.searchRooms), searchRooms);

module.exports = router;
