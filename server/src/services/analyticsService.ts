import mongoose from 'mongoose';
import UserActivity from '../models/UserActivity.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import logger from '../utils/logger.js';

export interface ActivityStats {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByDay: Array<{ date: string; count: number }>;
  topActiveUsers: Array<{ userId: string; userName: string; activityCount: number }>;
  messagesSent: number;
  messagesReceived: number;
  conversationsCreated: number;
  logins: number;
  logouts: number;
  profileUpdates: number;
}

export interface UserActivityReport {
  userId: string;
  userName: string;
  email: string;
  totalActivities: number;
  activitiesByType: Record<string, number>;
  lastActivityAt: Date | null;
  messagesSent: number;
  messagesReceived: number;
  conversationsCreated: number;
  averageMessagesPerDay: number;
  mostActiveDay: string | null;
}

export interface TimeRangeStats {
  startDate: Date;
  endDate: Date;
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
  totalActivities: number;
  peakActivityHour: number;
  activitiesByHour: Array<{ hour: number; count: number }>;
}

/**
 * Get overall activity statistics
 */
export const getActivityStats = async (startDate?: Date, endDate?: Date): Promise<ActivityStats> => {
  try {
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
    ];

    const activitiesByTypeResult = await UserActivity.aggregate(pipeline);
    const activitiesByType: Record<string, number> = {};
    let totalActivities = 0;

    activitiesByTypeResult.forEach((item) => {
      activitiesByType[item._id] = item.count;
      totalActivities += item.count;
    });

    // Get activities by day
    const dayPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const activitiesByDayResult = await UserActivity.aggregate(dayPipeline);
    const activitiesByDay = activitiesByDayResult.map((item) => ({
      date: item._id,
      count: item.count,
    }));

    // Get top active users
    const topUsersPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          activityCount: { $sum: 1 },
        },
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: { $toString: '$_id' },
          userName: '$user.name',
          activityCount: 1,
        },
      },
    ];

    const topActiveUsers = await UserActivity.aggregate(topUsersPipeline);

    return {
      totalActivities,
      activitiesByType,
      activitiesByDay,
      topActiveUsers,
      messagesSent: activitiesByType['message_sent'] || 0,
      messagesReceived: activitiesByType['message_received'] || 0,
      conversationsCreated: activitiesByType['conversation_created'] || 0,
      logins: activitiesByType['login'] || 0,
      logouts: activitiesByType['logout'] || 0,
      profileUpdates: activitiesByType['profile_updated'] || 0,
    };
  } catch (error: any) {
    logger.error('Error getting activity stats:', error);
    throw error;
  }
};

/**
 * Get detailed user activity report
 */
export const getUserActivityReport = async (userId: string, startDate?: Date, endDate?: Date): Promise<UserActivityReport | null> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    // Get total activities and by type
    const statsPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
    ];

    const statsResult = await UserActivity.aggregate(statsPipeline);
    const activitiesByType: Record<string, number> = {};
    let totalActivities = 0;

    statsResult.forEach((item) => {
      activitiesByType[item._id] = item.count;
      totalActivities += item.count;
    });

    // Get last activity
    const lastActivity = await UserActivity.findOne(matchStage).sort({ timestamp: -1 });

    // Calculate average messages per day
    const daysDiff = startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30; // Default to 30 days if no range provided

    const averageMessagesPerDay = daysDiff > 0 ? (activitiesByType['message_sent'] || 0) / daysDiff : 0;

    // Get most active day
    const dayPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ];

    const mostActiveDayResult = await UserActivity.aggregate(dayPipeline);
    const mostActiveDay = mostActiveDayResult.length > 0 ? mostActiveDayResult[0]._id : null;

    return {
      userId: user._id.toString(),
      userName: user.name,
      email: user.email,
      totalActivities,
      activitiesByType,
      lastActivityAt: lastActivity?.timestamp || null,
      messagesSent: activitiesByType['message_sent'] || 0,
      messagesReceived: activitiesByType['message_received'] || 0,
      conversationsCreated: activitiesByType['conversation_created'] || 0,
      averageMessagesPerDay: Math.round(averageMessagesPerDay * 100) / 100,
      mostActiveDay,
    };
  } catch (error: any) {
    logger.error('Error getting user activity report:', error);
    throw error;
  }
};

/**
 * Get time range statistics
 */
export const getTimeRangeStats = async (startDate: Date, endDate: Date): Promise<TimeRangeStats> => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();

    // Get active users (users with activities in range)
    const activeUsersResult = await UserActivity.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate },
    });
    const activeUsers = activeUsersResult.length;

    // Get total messages in range
    const totalMessages = await Message.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get total conversations created in range
    const totalConversations = await Conversation.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get total activities
    const totalActivities = await UserActivity.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Get activities by hour
    const hourPipeline = [
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const activitiesByHourResult = await UserActivity.aggregate(hourPipeline);
    const activitiesByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: activitiesByHourResult.find((item) => item._id === i)?.count || 0,
    }));

    // Find peak activity hour
    const peakActivityHour = activitiesByHour.reduce(
      (max, item) => (item.count > max.count ? item : max),
      activitiesByHour[0]
    ).hour;

    return {
      startDate,
      endDate,
      totalUsers,
      activeUsers,
      totalMessages,
      totalConversations,
      totalActivities,
      peakActivityHour,
      activitiesByHour,
    };
  } catch (error: any) {
    logger.error('Error getting time range stats:', error);
    throw error;
  }
};

/**
 * Get all user activity reports
 */
export const getAllUserActivityReports = async (startDate?: Date, endDate?: Date): Promise<UserActivityReport[]> => {
  try {
    const users = await User.find({});
    const reports: UserActivityReport[] = [];

    for (const user of users) {
      const report = await getUserActivityReport(user._id.toString(), startDate, endDate);
      if (report) {
        reports.push(report);
      }
    }

    return reports.sort((a, b) => b.totalActivities - a.totalActivities);
  } catch (error: any) {
    logger.error('Error getting all user activity reports:', error);
    throw error;
  }
};

