import { Request, Response } from 'express';
import {
  getActivityStats,
  getUserActivityReport,
  getTimeRangeStats,
  getAllUserActivityReports,
} from '../services/analyticsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { runAnalyticsCollection } from '../jobs/analyticsJob.js';

/**
 * Get overall activity statistics
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (req.query.startDate) {
    const date = new Date(req.query.startDate as string);
    // Set to start of day (00:00:00.000)
    date.setHours(0, 0, 0, 0);
    startDate = date;
  }

  if (req.query.endDate) {
    const date = new Date(req.query.endDate as string);
    // Set to end of day (23:59:59.999)
    date.setHours(23, 59, 59, 999);
    endDate = date;
  }

  const stats = await getActivityStats(startDate, endDate);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Get user activity report
 */
export const getUserReport = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (req.query.startDate) {
    const date = new Date(req.query.startDate as string);
    date.setHours(0, 0, 0, 0);
    startDate = date;
  }

  if (req.query.endDate) {
    const date = new Date(req.query.endDate as string);
    date.setHours(23, 59, 59, 999);
    endDate = date;
  }

  const report = await getUserActivityReport(userId, startDate, endDate);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get all user activity reports
 */
export const getAllUserReports = asyncHandler(async (req: Request, res: Response) => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (req.query.startDate) {
    const date = new Date(req.query.startDate as string);
    date.setHours(0, 0, 0, 0);
    startDate = date;
  }

  if (req.query.endDate) {
    const date = new Date(req.query.endDate as string);
    date.setHours(23, 59, 59, 999);
    endDate = date;
  }

  const reports = await getAllUserActivityReports(startDate, endDate);

  res.json({
    success: true,
    data: reports,
  });
});

/**
 * Get time range statistics
 */
export const getTimeRangeReport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.query.startDate || !req.query.endDate) {
    return res.status(400).json({
      success: false,
      error: 'Both startDate and endDate are required.',
    });
  }

  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date range. Please provide valid startDate and endDate.',
    });
  }

  // Set to start and end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Validate date range
  if (startDate > endDate) {
    return res.status(400).json({
      success: false,
      error: 'Start date must be before or equal to end date.',
    });
  }

  const stats = await getTimeRangeStats(startDate, endDate);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Trigger analytics collection job manually
 */
export const triggerAnalyticsJob = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Run the job with 1-hour lookback to collect recent activities
    await runAnalyticsCollection(1);
    
    res.json({
      success: true,
      message: 'Analytics collection job completed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run analytics collection job',
    });
  }
});

