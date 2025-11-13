import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  attachments: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
  status: 'sent' | 'delivered' | 'seen';
  parentMessageId?: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  metadata: {
    isAIMessage?: boolean;
    aiPrompt?: string;
    isAISummary?: boolean;
    summaryInfo?: {
      requestedBy?: mongoose.Types.ObjectId;
      requestedByName?: string;
      requestedAt?: Date;
      rangeStart?: Date;
      rangeEnd?: Date;
      messageCount?: number;
    };
  };
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: false, // Make it explicitly optional
      trim: true,
      default: '',
      validate: {
        validator: function(this: IMessage, value: string) {
          // Text is required only if there are no attachments
          const hasAttachments = this.attachments && this.attachments.length > 0;
          const hasText = value && value.trim().length > 0;
          return hasText || hasAttachments;
        },
        message: 'Message text is required when there are no attachments',
      },
    },
    attachments: {
      type: [
        new Schema({
          url: { type: String, required: true },
          type: { type: String, required: true }, // 'image', 'file', etc.
          name: { type: String, required: false },
        }, { _id: false }),
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    parentMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: {
      isAIMessage: {
        type: Boolean,
        default: false,
      },
      aiPrompt: String, // Original prompt if AI-generated
      isAISummary: {
        type: Boolean,
        default: false,
      },
      summaryInfo: {
        requestedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        requestedByName: String,
        requestedAt: Date,
        rangeStart: Date,
        rangeEnd: Date,
        messageCount: Number,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;

