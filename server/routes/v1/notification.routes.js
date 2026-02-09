const express = require('express');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} = require('@controllers/v1/notification.controller.js');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const notificationSchema = require('@validators/v1/notification.schema');
const router = express.Router();

// root route: /api/notifications
// All routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * Get notifications for authenticated user (with pagination)
 */
router.get(
  '/',
  validate(notificationSchema.getNotifications),
  getNotifications
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  validate(notificationSchema.getUnreadCount),
  getUnreadCount
);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch(
  '/read-all',
  validate(notificationSchema.markAllNotificationsAsRead),
  markAllNotificationsAsRead
);

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
router.patch(
  '/:notificationId/read',
  validate(notificationSchema.markNotificationAsRead),
  markNotificationAsRead
);

module.exports = router;
