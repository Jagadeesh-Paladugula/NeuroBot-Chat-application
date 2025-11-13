import cron from 'node-cron';
import UserActivity from '../models/UserActivity.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import logger from '../utils/logger.js';

/**
 * Job to collect user activity analytics
 * Runs every hour to aggregate recent activities
 * @param lookbackHours - Number of hours to look back (default: 1, use 24 on startup to catch missed activities)
 */
export const runAnalyticsCollection = async (lookbackHours: number = 1): Promise<void> => {
  try {
    logger.info(`📊 Starting analytics collection job (looking back ${lookbackHours} hour(s))...`);

    const lookbackMs = lookbackHours * 60 * 60 * 1000;
    const lookbackTime = new Date(Date.now() - lookbackMs);
    const now = new Date();

    // Collect message activities from the lookback period
    const recentMessages = await Message.find({
      createdAt: { $gte: lookbackTime, $lte: now },
    });

    const activities = [];

    for (const message of recentMessages) {
      // Create message_sent activity for sender
      activities.push({
        userId: message.senderId,
        activityType: 'message_sent',
        metadata: {
          messageId: message._id,
          conversationId: message.conversationId,
        },
        timestamp: message.createdAt,
      });

      // Create message_received activities for other participants
      const conversation = await Conversation.findById(message.conversationId);
      if (conversation) {
        const otherParticipants = conversation.participants.filter(
          (p: any) => p.toString() !== message.senderId.toString()
        );
        for (const participantId of otherParticipants) {
          activities.push({
            userId: participantId,
            activityType: 'message_received',
            metadata: {
              messageId: message._id,
              conversationId: message.conversationId,
              senderId: message.senderId,
            },
            timestamp: message.createdAt,
          });
        }
      }
    }

    // Collect conversation creation activities
    const recentConversations = await Conversation.find({
      createdAt: { $gte: lookbackTime, $lte: now },
    });

    for (const conversation of recentConversations) {
      if (conversation.createdBy) {
        activities.push({
          userId: conversation.createdBy,
          activityType: 'conversation_created',
          metadata: {
            conversationId: conversation._id,
            type: conversation.type,
            name: conversation.name,
          },
          timestamp: conversation.createdAt,
        });
      }
    }

    // Bulk insert activities (avoid duplicates)
    if (activities.length > 0) {
      // Check for existing activities to avoid duplicates
      const existingActivities = await UserActivity.find({
        timestamp: { $gte: lookbackTime, $lte: now },
      });

      const existingKeys = new Set(
        existingActivities.map((a) => `${a.userId}-${a.activityType}-${a.metadata.messageId || a.metadata.conversationId}-${a.timestamp.getTime()}`)
      );

      const newActivities = activities.filter((a) => {
        const key = `${a.userId}-${a.activityType}-${a.metadata.messageId || a.metadata.conversationId}-${new Date(a.timestamp).getTime()}`;
        return !existingKeys.has(key);
      });

      if (newActivities.length > 0) {
        await UserActivity.insertMany(newActivities);
        logger.info(`✅ Collected ${newActivities.length} new activity records`);
      } else {
        logger.info('ℹ️  No new activities to collect');
      }
    } else {
      logger.info(`ℹ️  No activities found in the last ${lookbackHours} hour(s)`);
    }

    logger.info('✅ Analytics collection job completed');
  } catch (error: any) {
    logger.error('❌ Error in analytics collection job:', error);
  }
};

/**
 * Initialize and schedule analytics collection job
 * Runs every hour at minute 0
 */
export const initializeAnalyticsJob = (): void => {
  // Run immediately on startup with 24-hour lookback to catch any missed activities
  // This ensures we collect activities that happened while the server was down
  runAnalyticsCollection(24);

  // Schedule to run every hour with 1-hour lookback
  cron.schedule('0 * * * *', () => {
    runAnalyticsCollection(1);
  });

  logger.info('📅 Analytics collection job scheduled (runs every hour)');
};

