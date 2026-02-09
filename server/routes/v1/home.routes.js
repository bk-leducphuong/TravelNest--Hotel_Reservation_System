const express = require('express');
const {
  getRecentViewedHotels,
  recordHotelView,
  getRecentSearches,
  removeRecentSearch,
  getPopularPlaces,
  getNearbyHotels,
  getTopRatedHotels,
  getRecentlyViewedHotels,
  getPopularDestinations,
  getTrendingHotels,
} = require('@controllers/v1/home.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const homeSchema = require('@validators/v1/home.schema');
const router = express.Router();

// root route: /api/home

/**
 * GET /api/home/recent-viewed-hotels
 * Get recent viewed hotels (optional authentication)
 * Query params: hotelIds (for non-authenticated users)
 */
router.get(
  '/recent-viewed-hotels',
  validate(homeSchema.getRecentViewedHotels),
  getRecentViewedHotels
);

/**
 * POST /api/home/recent-viewed-hotels
 * Record a hotel view (authenticated)
 */
router.post(
  '/recent-viewed-hotels',
  authenticate,
  validate(homeSchema.recordHotelView),
  recordHotelView
);

/**
 * GET /api/home/recent-searches
 * Get recent searches (authenticated)
 */
router.get(
  '/recent-searches',
  authenticate,
  validate(homeSchema.getRecentSearches),
  getRecentSearches
);

/**
 * DELETE /api/home/recent-searches/:searchId
 * Remove a recent search (authenticated)
 */
router.delete(
  '/recent-searches/:searchId',
  authenticate,
  validate(homeSchema.removeRecentSearch),
  removeRecentSearch
);

/**
 * GET /api/home/popular-places
 * Get popular places (public)
 */
router.get(
  '/popular-places',
  validate(homeSchema.getPopularPlaces),
  getPopularPlaces
);

/**
 * GET /api/home/nearby-hotels
 * Get nearby hotels based on coordinates (public)
 */
router.get(
  '/nearby-hotels',
  validate(homeSchema.getNearbyHotels),
  getNearbyHotels
);

/**
 * GET /api/home/top-rated-hotels
 * Get top rated hotels (public)
 */
router.get(
  '/top-rated-hotels',
  validate(homeSchema.getTopRatedHotels),
  getTopRatedHotels
);

/**
 * GET /api/home/recently-viewed-hotels
 * Get recently viewed hotels with full details (authenticated)
 */
router.get(
  '/recently-viewed-hotels',
  authenticate,
  validate(homeSchema.getRecentlyViewedHotels),
  getRecentlyViewedHotels
);

/**
 * GET /api/home/popular-destinations
 * Get popular destinations (public)
 */
router.get(
  '/popular-destinations',
  validate(homeSchema.getPopularDestinations),
  getPopularDestinations
);

/**
 * GET /api/home/trending-hotels
 * Get trending hotels (public)
 */
router.get(
  '/trending-hotels',
  validate(homeSchema.getTrendingHotels),
  getTrendingHotels
);

module.exports = router;
