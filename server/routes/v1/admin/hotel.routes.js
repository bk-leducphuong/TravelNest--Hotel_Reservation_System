const express = require('express');
const {
  getAllHotels,
  getHotelById,
  updateHotel,
} = require('@controllers/v1/admin/hotel.controller');
const {
  getHotelPhotos,
  addHotelPhotos,
  deleteHotelPhotos,
} = require('@controllers/v1/admin/room.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('@validators/v1/admin/hotel.schema');
const roomSchema = require('@validators/v1/admin/room.schema');
const upload = require('@config/multer.config');
const router = express.Router();

// Root route: /api/admin/hotels
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/hotels
 * Get all hotels owned by the authenticated admin
 */
router.get('/', validate(hotelSchema.getAllHotels), getAllHotels);

/**
 * GET /api/admin/hotels/:hotelId
 * Get a specific hotel by ID
 */
router.get('/:hotelId', validate(hotelSchema.getHotelById), getHotelById);

/**
 * PATCH /api/admin/hotels/:hotelId
 * Update hotel information
 */
router.patch('/:hotelId', validate(hotelSchema.updateHotel), updateHotel);

/**
 * GET /api/admin/hotels/:hotelId/photos
 * Get all photos for a hotel
 */
router.get(
  '/:hotelId/photos',
  validate(roomSchema.getHotelPhotos),
  getHotelPhotos
);

/**
 * POST /api/admin/hotels/:hotelId/photos
 * Add photos to a hotel
 */
router.post(
  '/:hotelId/photos',
  upload.array('images', 30),
  validate(roomSchema.addHotelPhotos),
  addHotelPhotos
);

/**
 * DELETE /api/admin/hotels/:hotelId/photos
 * Delete photos from a hotel
 */
router.delete(
  '/:hotelId/photos',
  validate(roomSchema.deleteHotelPhotos),
  deleteHotelPhotos
);

module.exports = router;
