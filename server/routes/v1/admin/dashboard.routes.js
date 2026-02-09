const express = require('express');
const {
  getTotalBookings,
  getRevenueStats,
  getDailyRevenueChart,
  getRoomBookings,
  getNewCustomers,
  getWeeklyChange,
  getDashboardOverview,
} = require('@controllers/v1/admin/dashboard.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const dashboardSchema = require('@validators/v1/admin/dashboard.schema');
const router = express.Router();

// Root route: /api/admin/dashboard
// All routes require admin authentication
router.use(authenticate);

/**
 * GET /api/admin/dashboard/overview
 * Get complete dashboard overview with all statistics
 */
router.get(
  '/overview',
  validate(dashboardSchema.getDashboardOverview),
  getDashboardOverview
);

/**
 * GET /api/admin/dashboard/bookings/total
 * Get total bookings count for a hotel in a time period
 */
router.get(
  '/bookings/total',
  validate(dashboardSchema.getTotalBookings),
  getTotalBookings
);

/**
 * GET /api/admin/dashboard/revenue/stats
 * Get revenue statistics for a hotel
 */
router.get(
  '/revenue/stats',
  validate(dashboardSchema.getRevenueStats),
  getRevenueStats
);

/**
 * GET /api/admin/dashboard/revenue/daily
 * Get daily revenue chart data
 */
router.get(
  '/revenue/daily',
  validate(dashboardSchema.getDailyRevenueChart),
  getDailyRevenueChart
);

/**
 * GET /api/admin/dashboard/revenue/weekly-change
 * Calculate weekly revenue change
 */
router.get(
  '/revenue/weekly-change',
  validate(dashboardSchema.getWeeklyChange),
  getWeeklyChange
);

/**
 * GET /api/admin/dashboard/rooms/bookings
 * Get room booking statistics
 */
router.get(
  '/rooms/bookings',
  validate(dashboardSchema.getRoomBookings),
  getRoomBookings
);

/**
 * GET /api/admin/dashboard/customers/new
 * Get new customers for a hotel
 */
router.get(
  '/customers/new',
  validate(dashboardSchema.getNewCustomers),
  getNewCustomers
);

module.exports = router;
