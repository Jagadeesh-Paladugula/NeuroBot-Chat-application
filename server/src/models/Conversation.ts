import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  type: 'one-to-one' | 'group';
  name?: string;
  createdBy?: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  aiSummary?: any;
  aiSummaries: any[];
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ['one-to-one', 'group'],
      default: 'one-to-one',
    },
    name: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    aiSummary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    aiSummaries: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Ensure participants array has at least 2 users
conversationSchema.pre('save', function (next) {
  if (this.participants.length < 2) {
    return next(new Error('Conversation must have at least 2 participants'));
  }
  // For one-to-one chats, ensure exactly 2 participants
  if (this.type === 'one-to-one' && this.participants.length !== 2) {
    return next(new Error('One-to-one conversation must have exactly 2 participants'));
  }
  // For group chats, ensure at least 2 participants
  if (this.type === 'group' && this.participants.length < 2) {
    return next(new Error('Group conversation must have at least 2 participants'));
  }
  next();
});

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;

