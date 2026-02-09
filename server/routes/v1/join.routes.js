const express = require('express');
const {
  submitJoinForm,
  uploadPhotos,
} = require('@controllers/v1/join.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const upload = require('@config/multer.config');
const validate = require('@middlewares/validate.middleware');
const joinSchema = require('@validators/v1/join.schema');
const router = express.Router();

// root route: /api/join
// All routes require authentication (admin/partner)
router.use(authenticate);

/**
 * POST /api/join
 * Submit join form (become a partner)
 * Creates or updates hotel, creates room, and initializes room inventory
 */
router.post('/', validate(joinSchema.submitJoinForm), submitJoinForm);

/**
 * POST /api/join/photos
 * Upload and process hotel/room photos
 */
router.post(
  '/photos',
  upload.array('images', 30),
  validate(joinSchema.uploadPhotos),
  uploadPhotos
);

module.exports = router;
