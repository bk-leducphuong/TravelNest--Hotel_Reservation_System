const express = require('express');
const {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('@controllers/v1/admin/notification.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const notificationSchema = require('@validators/v1/admin/notification.schema');
const router = express.Router();

// Root route: /api/admin/notifications
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/notifications
 * Get all notifications for a specific hotel
 */
router.get(
  '/',
  validate(notificationSchema.getNotifications),
  getNotifications
);

/**
 * PATCH /api/admin/notifications/read-all
 * Mark all notifications as read for a hotel
 * Note: This must come before /:notificationId routes
 */
router.patch(
  '/read-all',
  validate(notificationSchema.markAllNotificationsAsRead),
  markAllNotificationsAsRead
);

/**
 * GET /api/admin/notifications/:notificationId
 * Get a specific notification by ID
 */
router.get(
  '/:notificationId',
  validate(notificationSchema.getNotificationById),
  getNotificationById
);

/**
 * PATCH /api/admin/notifications/:notificationId/read
 * Mark a specific notification as read
 */
router.patch(
  '/:notificationId/read',
  validate(notificationSchema.markNotificationAsRead),
  markNotificationAsRead
);

/**
 * DELETE /api/admin/notifications/:notificationId
 * Delete a notification
 */
router.delete(
  '/:notificationId',
  validate(notificationSchema.deleteNotification),
  deleteNotification
);

module.exports = router;
