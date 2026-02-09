const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomPhotos,
  addRoomPhotos,
  deleteRoomPhotos,
  getHotelPhotos,
  addHotelPhotos,
  deleteHotelPhotos,
  getRoomInventory,
  updateRoomInventory,
} = require('@controllers/v1/admin/room.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const roomSchema = require('@validators/v1/admin/room.schema');
const upload = require('@config/multer.config');
const router = express.Router();

// Root route: /api/admin/rooms
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/rooms
 * Get all rooms for a specific hotel
 */
router.get('/', validate(roomSchema.getAllRooms), getAllRooms);

/**
 * POST /api/admin/rooms
 * Create a new room
 */
router.post('/', validate(roomSchema.createRoom), createRoom);

/**
 * GET /api/admin/rooms/:roomId
 * Get a specific room by ID
 */
router.get('/:roomId', validate(roomSchema.getRoomById), getRoomById);

/**
 * PATCH /api/admin/rooms/:roomId
 * Update room information
 */
router.patch('/:roomId', validate(roomSchema.updateRoom), updateRoom);

/**
 * DELETE /api/admin/rooms/:roomId
 * Delete a room
 */
router.delete('/:roomId', validate(roomSchema.deleteRoom), deleteRoom);

/**
 * GET /api/admin/rooms/:roomId/photos
 * Get all photos for a room
 */
router.get(
  '/:roomId/photos',
  validate(roomSchema.getRoomPhotos),
  getRoomPhotos
);

/**
 * POST /api/admin/rooms/:roomId/photos
 * Add photos to a room
 */
router.post(
  '/:roomId/photos',
  upload.array('images', 30),
  validate(roomSchema.addRoomPhotos),
  addRoomPhotos
);

/**
 * DELETE /api/admin/rooms/:roomId/photos
 * Delete photos from a room
 */
router.delete(
  '/:roomId/photos',
  validate(roomSchema.deleteRoomPhotos),
  deleteRoomPhotos
);

/**
 * GET /api/admin/rooms/:roomId/inventory
 * Get room inventory (availability and pricing)
 */
router.get(
  '/:roomId/inventory',
  validate(roomSchema.getRoomInventory),
  getRoomInventory
);

/**
 * PATCH /api/admin/rooms/:roomId/inventory
 * Update room inventory
 */
router.patch(
  '/:roomId/inventory',
  validate(roomSchema.updateRoomInventory),
  updateRoomInventory
);

module.exports = router;
