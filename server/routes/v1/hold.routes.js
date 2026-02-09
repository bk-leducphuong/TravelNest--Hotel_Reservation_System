/**
 * Hold API - Temporarily hold rooms during checkout
 * Prevents other users from booking the same room while the user completes payment.
 *
 * Flow:
 * 1. POST /hold - Create hold (validates payload, checks availability, creates hold + increments held_rooms)
 * 2. Optional: Redis cache user_holds:{userId} to limit or fast-check active holds
 * 3. Optional: BullMQ job to release hold when expires_at is reached
 * 4. DELETE /hold/:holdId - Release hold (user cancels or timeout)
 */

const express = require('express');
const {
  createHold,
  getMyHolds,
  getHoldById,
  releaseHold,
} = require('@controllers/v1/hold.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const holdSchema = require('@validators/v1/hold.schema');

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/hold
 * Create a temporary hold for the given rooms and dates
 * Body: { hotelId, checkInDate, checkOutDate, numberOfGuests, rooms: [{ roomId, quantity }], currency? }
 */
router.post('/', validate(holdSchema.createHold), createHold);

/**
 * GET /api/hold
 * Get active holds for the authenticated user
 */
router.get('/', getMyHolds);

/**
 * GET /api/hold/:holdId
 * Get hold by ID (must be owner)
 */
router.get('/:holdId', validate(holdSchema.getHoldById), getHoldById);

/**
 * DELETE /api/hold/:holdId
 * Release hold (cancels the temporary lock)
 */
router.delete('/:holdId', validate(holdSchema.releaseHold), releaseHold);

module.exports = router;
