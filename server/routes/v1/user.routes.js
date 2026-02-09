const express = require('express');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
  updateAvatar,
  getFavoriteHotels,
  addFavoriteHotel,
  removeFavoriteHotel,
  checkFavoriteHotel,
} = require('@controllers/v1/user.controller.js');
const upload = require('@config/multer.config');
const validate = require('@middlewares/validate.middleware');
const userSchema = require('@validators/v1/user.schema');
const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Current user resource
// GET /api/user - Get current user information
router.get('/', validate(userSchema.getCurrentUser), getCurrentUser);

// PATCH /api/user - Update current user (partial update)
router.patch('/', validate(userSchema.updateCurrentUser), updateCurrentUser);

// PATCH /api/user/password - Update password
router.patch('/password', validate(userSchema.updatePassword), updatePassword);

// PATCH /api/user/avatar - Update avatar
router.patch(
  '/avatar',
  upload.single('avatar'),
  validate(userSchema.updateAvatar),
  updateAvatar
);

// Favorite hotels nested resource
// GET /api/user/favorite-hotels - Get favorite hotels (with pagination)
router.get(
  '/favorite-hotels',
  validate(userSchema.getFavoriteHotels),
  getFavoriteHotels
);

// POST /api/user/favorite-hotels - Add favorite hotel
router.post(
  '/favorite-hotels',
  validate(userSchema.addFavoriteHotel),
  addFavoriteHotel
);

// GET /api/user/favorite-hotels/:hotelId - Check if hotel is favorite
router.get(
  '/favorite-hotels/:hotelId',
  validate(userSchema.checkFavoriteHotel),
  checkFavoriteHotel
);

// DELETE /api/user/favorite-hotels/:hotelId - Remove favorite hotel
router.delete(
  '/favorite-hotels/:hotelId',
  validate(userSchema.removeFavoriteHotel),
  removeFavoriteHotel
);

module.exports = router;
