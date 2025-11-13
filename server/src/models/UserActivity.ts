import mongoose, { Document, Schema } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  activityType: 'message_sent' | 'message_received' | 'conversation_created' | 'login' | 'logout' | 'profile_updated';
  metadata: {
    conversationId?: mongoose.Types.ObjectId;
    messageId?: mongoose.Types.ObjectId;
    recipientId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  timestamp: Date;
}

const userActivitySchema = new Schema<IUserActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ['message_sent', 'message_received', 'conversation_created', 'login', 'logout', 'profile_updated'],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ activityType: 1, timestamp: -1 });
userActivitySchema.index({ timestamp: -1 });

const UserActivity = mongoose.model<IUserActivity>('UserActivity', userActivitySchema);

export default UserActivity;

