import express from 'express';
import {
  getStats,
  getUserReport,
  getAllUserReports,
  getTimeRangeReport,
  triggerAnalyticsJob,
} from '../controllers/analyticsController.js';
import { adminMiddleware } from '../utils/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(adminMiddleware);

/**
 * @swagger
 * /api/analytics/stats:
 *   get:
 *     summary: Get overall activity statistics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/stats', getStats);

/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get all user activity reports (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: User reports retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/users', getAllUserReports);

/**
 * @swagger
 * /api/analytics/users/:userId:
 *   get:
 *     summary: Get user activity report (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: User report retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.get('/users/:userId', getUserReport);

/**
 * @swagger
 * /api/analytics/time-range:
 *   get:
 *     summary: Get time range statistics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date
 *     responses:
 *       200:
 *         description: Time range statistics retrieved successfully
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/time-range', getTimeRangeReport);

/**
 * @swagger
 * /api/analytics/trigger-job:
 *   post:
 *     summary: Manually trigger analytics collection job (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job triggered successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Job execution failed
 */
router.post('/trigger-job', triggerAnalyticsJob);

export default router;

