import mongoose from 'mongoose';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import User from '../../models/User.js';
import { sendToAssistant, getAssistantUserId } from '../../services/gemini.js';
import {
  emitConversationEvent,
  emitConversationMessage,
} from '../../sockets/socketHandler.js';

const toISOStringOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toStringOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value?.toString) {
    return value.toString();
  }
  try {
    return String(value);
  } catch (error) {
    return null;
  }
};

const formatSummary = (summary, fallbackPrefix = 'summary') => {
  if (!summary) {
    return null;
  }

  const text = summary.text ?? summary.summary;
  if (!text) {
    return null;
  }

  const generatedAtIso =
    toISOStringOrNull(summary.generatedAt) ||
    toISOStringOrNull(summary.generated_at) ||
    toISOStringOrNull(summary.createdAt) ||
    toISOStringOrNull(summary.created_at) ||
    new Date().toISOString();

  const generatedTimestamp = new Date(generatedAtIso).getTime();

  const idCandidate = summary._id ?? summary.id ?? summary.summaryId;
  const normalizedId =
    toStringOrNull(idCandidate) ??
    `${fallbackPrefix}-${Number.isNaN(generatedTimestamp) ? Date.now() : generatedTimestamp}`;

  const summaryMessageId =
    summary.summaryMessageId ??
    summary.summary_message_id ??
    summary.messageId ??
    summary.message_id;

  return {
    _id: normalizedId,
    text,
    messageCount:
      typeof summary.messageCount === 'number'
        ? summary.messageCount
        : Number.parseInt(summary.messageCount ?? 0, 10) || 0,
    generatedAt: generatedAtIso,
    lastMessageCreatedAt:
      toISOStringOrNull(summary.lastMessageCreatedAt) ||
      toISOStringOrNull(summary.last_message_created_at) ||
      null,
    requestedBy: toStringOrNull(summary.requestedBy ?? summary.requested_by),
    requestedByName: summary.requestedByName ?? summary.requested_by_name ?? '',
    summaryMessageId: toStringOrNull(summaryMessageId),
    rangeStart:
      toISOStringOrNull(summary.rangeStart) ||
      toISOStringOrNull(summary.range_start) ||
      null,
    rangeEnd:
      toISOStringOrNull(summary.rangeEnd) ||
      toISOStringOrNull(summary.range_end) ||
      null,
    requestedAt:
      toISOStringOrNull(summary.requestedAt) ||
      toISOStringOrNull(summary.requested_at) ||
      generatedAtIso,
  };
};

const buildSummaryResponseList = (summaries = [], fallbackSummary = null) => {
  const map = new Map();

  (Array.isArray(summaries) ? summaries : []).forEach((entry) => {
    const formatted = formatSummary(entry);
    if (formatted) {
      map.set(formatted._id, formatted);
    }
  });

  const fallbackFormatted = formatSummary(fallbackSummary, 'legacy');
  if (fallbackFormatted && !map.has(fallbackFormatted._id)) {
    map.set(fallbackFormatted._id, fallbackFormatted);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.lastMessageCreatedAt || a.generatedAt || 0).getTime();
    const bTime = new Date(b.lastMessageCreatedAt || b.generatedAt || 0).getTime();
    return aTime - bTime;
  });
};

const getLatestSummary = (summaryList = []) =>
  summaryList.length ? summaryList[summaryList.length - 1] : null;

// Helper function to normalize conversation data
const normalizeConversation = (conv, userId, unreadCount = 0) => {
  const summaries = buildSummaryResponseList(conv.aiSummaries, conv.aiSummary);
  const latestSummary = getLatestSummary(summaries);
  
  // Normalize participants to include both id and _id
  const normalizedParticipants = (conv.participants || []).map(p => {
    if (!p) return null;
    const pid = p._id ? p._id.toString() : (p.toString ? p.toString() : String(p));
    return {
      id: pid,
      _id: pid,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatarUrl,
      isOnline: p.isOnline,
      lastSeen: p.lastSeen,
      isDemo: p.isDemo,
    };
  }).filter(Boolean);
  
  // Normalize createdBy
  const normalizedCreatedBy = conv.createdBy ? {
    id: conv.createdBy._id ? conv.createdBy._id.toString() : String(conv.createdBy),
    _id: conv.createdBy._id ? conv.createdBy._id.toString() : String(conv.createdBy),
    name: conv.createdBy.name,
    email: conv.createdBy.email,
    avatarUrl: conv.createdBy.avatarUrl,
  } : null;
  
  // Normalize admins
  const normalizedAdmins = (conv.admins || []).map(admin => {
    if (!admin) return null;
    const aid = admin._id ? admin._id.toString() : (admin.toString ? admin.toString() : String(admin));
    return {
      id: aid,
      _id: aid,
      name: admin.name,
      email: admin.email,
      avatarUrl: admin.avatarUrl,
    };
  }).filter(Boolean);
  
  const convId = conv._id ? conv._id.toString() : String(conv.id || conv._id);
  
  // Normalize lastMessage
  let normalizedLastMessage = null;
  if (conv.lastMessage) {
    // Handle both populated message objects and ObjectId references
    if (typeof conv.lastMessage === 'object' && conv.lastMessage.text) {
      normalizedLastMessage = { ...conv.lastMessage };
      // Ensure _id and id are set
      if (normalizedLastMessage._id) {
        normalizedLastMessage.id = normalizedLastMessage._id.toString();
        normalizedLastMessage._id = normalizedLastMessage._id.toString();
      }
      if (normalizedLastMessage.senderId) {
        const senderId = normalizedLastMessage.senderId._id 
          ? normalizedLastMessage.senderId._id.toString() 
          : String(normalizedLastMessage.senderId);
        normalizedLastMessage.senderId = {
          id: senderId,
          _id: senderId,
          name: normalizedLastMessage.senderId.name,
          email: normalizedLastMessage.senderId.email,
          avatarUrl: normalizedLastMessage.senderId.avatarUrl,
        };
      }
    } else if (typeof conv.lastMessage === 'object' && conv.lastMessage._id && !conv.lastMessage.text) {
      // It's an ObjectId reference, not a populated message - set to null
      normalizedLastMessage = null;
    }
  }
  
  if (conv.type === 'one-to-one') {
    const otherParticipant = normalizedParticipants.find(
      (p) => p && p.id && p.id !== userId.toString()
    );
    
    const participant = otherParticipant || normalizedParticipants[0] || null;
    
    return {
      id: convId,
      _id: convId,
      type: conv.type,
      name: conv.name,
      participant: participant,
      participants: normalizedParticipants,
      lastMessage: normalizedLastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      aiSummaries: summaries,
      aiSummary: latestSummary,
    };
  } else {
    return {
      id: convId,
      _id: convId,
      type: conv.type,
      name: conv.name,
      participants: normalizedParticipants,
      createdBy: normalizedCreatedBy,
      admins: normalizedAdmins,
      lastMessage: normalizedLastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      aiSummaries: summaries,
      aiSummary: latestSummary,
    };
  }
};

export const conversationResolvers = {
  Query: {
    conversations: async (_, __, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const userId = context.userId;
      console.log('💬 Fetching conversations for userId:', userId);

      const conversations = await Conversation.find({
        participants: userId,
      })
        .populate('participants', 'name email avatarUrl isOnline lastSeen')
        .populate('createdBy', 'name email avatarUrl')
        .populate('admins', 'name email avatarUrl')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'senderId',
            select: 'name email avatarUrl'
          }
        })
        .sort({ lastMessageAt: -1 })
        .lean();

      console.log('✅ Found conversations:', conversations.length);
      const groupCount = conversations.filter(c => c.type === 'group').length;
      const oneToOneCount = conversations.filter(c => c.type === 'one-to-one').length;
      console.log('📊 Conversation breakdown:', { groups: groupCount, oneToOne: oneToOneCount });

      // Convert userId to ObjectId for proper comparison
      const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const unreadCountsResult = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversations.map(c => c._id) },
            senderId: { $ne: userIdObjectId },
            status: { $ne: 'seen' }
          }
        },
        {
          $group: {
            _id: '$conversationId',
            count: { $sum: 1 }
          }
        }
      ]);

      const unreadCountsMap = {};
      unreadCountsResult.forEach(item => {
        unreadCountsMap[item._id.toString()] = item.count;
      });

      const normalizedConversations = conversations.map((conv) => {
        const unreadCount = unreadCountsMap[conv._id.toString()] || 0;
        return normalizeConversation(conv, userId, unreadCount);
      });
      
      console.log('✅ Returning normalized conversations:', normalizedConversations.length);
      return normalizedConversations;
    },

    conversation: async (_, { id }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const conversation = await Conversation.findById(id)
        .populate('participants', 'name email avatarUrl isOnline lastSeen')
        .populate('createdBy', 'name email avatarUrl')
        .populate('admins', 'name email avatarUrl')
        .populate('lastMessage')
        .lean();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const participantIds = conversation.participants.map((p) => {
        const pid = p._id || p;
        return pid.toString();
      });

      if (!participantIds.includes(context.userId.toString())) {
        throw new Error('Access denied');
      }

      // Convert userId to ObjectId for proper comparison
      const userIdObjectId = mongoose.Types.ObjectId.isValid(context.userId) 
        ? new mongoose.Types.ObjectId(context.userId) 
        : context.userId;
      
      const unreadCountsResult = await Message.aggregate([
        {
          $match: {
            conversationId: conversation._id,
            senderId: { $ne: userIdObjectId },
            status: { $ne: 'seen' }
          }
        },
        {
          $group: {
            _id: '$conversationId',
            count: { $sum: 1 }
          }
        }
      ]);

      const unreadCount = unreadCountsResult[0]?.count || 0;
      return normalizeConversation(conversation, context.userId, unreadCount);
    },

    messages: async (_, { conversationId, page = 1, limit = 50 }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const skip = (page - 1) * limit;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const participantIds = conversation.participants.map((participant) => {
        if (!participant) return null;
        if (typeof participant === 'string') return participant;
        if (participant?._id) return participant._id.toString();
        if (participant.toString) return participant.toString();
        return String(participant);
      });

      if (!participantIds.includes(context.userId.toString())) {
        throw new Error('Access denied');
      }

      const messages = await Message.find({ conversationId })
        .populate('senderId', 'name email avatarUrl')
        .populate('parentMessageId', 'text senderId')
        .populate('mentions', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      messages.reverse();

      // Normalize messages
      const normalizedMessages = messages.map(msg => {
        const msgObj = { ...msg };
        // Normalize senderId
        if (msgObj.senderId) {
          const senderId = msgObj.senderId._id ? msgObj.senderId._id.toString() : String(msgObj.senderId);
          msgObj.senderId = {
            id: senderId,
            _id: senderId,
            name: msgObj.senderId.name,
            email: msgObj.senderId.email,
            avatarUrl: msgObj.senderId.avatarUrl,
          };
        }
        // Normalize parentMessageId senderId if exists
        if (msgObj.parentMessageId && msgObj.parentMessageId.senderId) {
          const parentSenderId = msgObj.parentMessageId.senderId._id 
            ? msgObj.parentMessageId.senderId._id.toString() 
            : String(msgObj.parentMessageId.senderId);
          msgObj.parentMessageId.senderId = {
            id: parentSenderId,
            _id: parentSenderId,
            name: msgObj.parentMessageId.senderId.name,
            email: msgObj.parentMessageId.senderId.email,
            avatarUrl: msgObj.parentMessageId.senderId.avatarUrl,
          };
        }
        // Normalize mentions
        if (msgObj.mentions && Array.isArray(msgObj.mentions)) {
          msgObj.mentions = msgObj.mentions.map(mention => {
            if (!mention) return null;
            const mentionId = mention._id ? mention._id.toString() : String(mention);
            return {
              id: mentionId,
              _id: mentionId,
              name: mention.name,
              email: mention.email,
            };
          }).filter(Boolean);
        }
        return msgObj;
      });

      const summaryHistory = buildSummaryResponseList(
        conversation.aiSummaries,
        conversation.aiSummary
      );
      const latestSummary = getLatestSummary(summaryHistory);

      return {
        messages: normalizedMessages,
        summaries: summaryHistory,
        aiSummary: latestSummary,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      };
    },

    users: async (_, __, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      console.log('👥 Fetching users for userId:', context.userId);
      const users = await User.find({ _id: { $ne: context.userId } })
        .select('name email avatarUrl isOnline lastSeen isDemo')
        .sort({ name: 1 })
        .lean();

      console.log('✅ Found users:', users.length);
      const normalizedUsers = users.map(user => ({
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isDemo: user.isDemo,
      }));
      
      console.log('✅ Returning normalized users:', normalizedUsers.length);
      return normalizedUsers;
    },

    conversationSummary: async (_, { conversationId }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const conversation = await Conversation.findById(conversationId).populate(
        'participants',
        'name email isDemo'
      );

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const userIdStr = context.userId.toString();
      const isParticipant = conversation.participants.some((participant) => {
        const participantId =
          participant?._id?.toString() ||
          (typeof participant === 'string' ? participant : String(participant));
        return participantId === userIdStr;
      });

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      if (conversation.type !== 'group') {
        throw new Error('AI summaries are only available for group chats');
      }

      const requester = conversation.participants.find(
        (p) => p?._id?.toString() === userIdStr
      );
      const requestedByName =
        requester?.name || requester?.email || 'Someone';

      const summaryHistory = buildSummaryResponseList(
        conversation.aiSummaries,
        conversation.aiSummary
      );
      const latestSummary = getLatestSummary(summaryHistory);
      const lastSummaryCutoffDate = latestSummary?.lastMessageCreatedAt
        ? new Date(latestSummary.lastMessageCreatedAt)
        : null;

      const messageQuery = {
        conversationId,
        'metadata.isAISummary': { $ne: true },
      };
      if (lastSummaryCutoffDate && !Number.isNaN(lastSummaryCutoffDate.getTime())) {
        messageQuery.createdAt = { $gt: lastSummaryCutoffDate };
      }

      const messages = await Message.find(messageQuery)
        .sort({ createdAt: 1 })
        .populate('senderId', 'name email isDemo')
        .lean();

      if (latestSummary && messages.length === 0) {
        let latestSummaryMessage = null;

        if (latestSummary.summaryMessageId) {
          latestSummaryMessage = await Message.findById(
            latestSummary.summaryMessageId
          )
            .populate('senderId', 'name email avatarUrl')
            .populate('parentMessageId', 'text senderId')
            .populate('mentions', 'name email')
            .lean();
        }

        if (!latestSummaryMessage) {
          latestSummaryMessage = await Message.findOne({
            conversationId,
            'metadata.isAISummary': true,
          })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name email avatarUrl')
            .populate('parentMessageId', 'text senderId')
            .populate('mentions', 'name email')
            .lean();
        }

        return {
          summaryId: latestSummary._id,
          summary: latestSummary.text,
          messageCount: latestSummary.messageCount,
          generatedAt: latestSummary.generatedAt,
          requestedBy: latestSummary.requestedBy,
          requestedByName: latestSummary.requestedByName,
          lastMessageCreatedAt: latestSummary.lastMessageCreatedAt,
          cached: true,
          summaryMessage: latestSummaryMessage,
          rangeStart: latestSummary.rangeStart,
          rangeEnd: latestSummary.rangeEnd,
          requestedAt: latestSummary.requestedAt,
        };
      }

      if (messages.length === 0) {
        return {
          summaryId: null,
          summary: 'No new messages since the last summary.',
          messageCount: 0,
          generatedAt: new Date().toISOString(),
          requestedBy: toStringOrNull(context.userId),
          requestedByName,
          cached: false,
          rangeStart: latestSummary?.rangeEnd ?? null,
          rangeEnd: latestSummary?.rangeEnd ?? null,
          requestedAt: new Date().toISOString(),
        };
      }

      const contextMessages = messages
        .filter((msg) => msg?.text && msg.text.trim().length > 0)
        .map((msg) => ({
          senderId: msg.senderId,
          text: `${msg.senderId?.name || msg.senderId?.email || 'Someone'}: ${
            msg.text
          }`,
        }));

      if (contextMessages.length === 0) {
        return {
          summaryId: null,
          summary: 'Not enough message content to summarize yet.',
          messageCount: 0,
          generatedAt: new Date().toISOString(),
          requestedBy: toStringOrNull(context.userId),
          requestedByName,
          cached: false,
        };
      }

      const summaryPrompt = `You are summarizing the most recent group conversation messages. Provide a single short paragraph (2-3 sentences max) that is warm, energetic, and under 80 words. Highlight the key topics, decisions, and any follow-up actions without using bullet points or numbered lists. If there is little to no meaningful discussion, state that there isn't enough activity to summarize.`;

      const aiSummary = await sendToAssistant({
        conversationId,
        prompt: summaryPrompt,
        contextMessages,
      });

      const lastMessageCreatedAt =
        messages[messages.length - 1]?.createdAt || new Date();

      if (!Array.isArray(conversation.aiSummaries)) {
        conversation.aiSummaries = [];
      }

      const assistantId = await getAssistantUserId();
      const summaryRequestedAt = new Date();

      const summaryMessage = new Message({
        conversationId,
        senderId: assistantId || context.userId,
        text: aiSummary,
        metadata: {
          isAIMessage: true,
          isAISummary: true,
          summaryInfo: {
            requestedBy: context.userId,
            requestedByName,
            requestedAt: summaryRequestedAt,
            rangeStart: lastSummaryCutoffDate || null,
            rangeEnd: lastMessageCreatedAt,
            messageCount: contextMessages.length,
          },
        },
      });

      await summaryMessage.save();
      await summaryMessage.populate('senderId', 'name email avatarUrl');
      await summaryMessage.populate('parentMessageId', 'text senderId');
      await summaryMessage.populate('mentions', 'name email');

      const summaryDoc = {
        text: aiSummary,
        messageCount: contextMessages.length,
        generatedAt: summaryMessage.createdAt,
        lastMessageCreatedAt,
        requestedBy: context.userId,
        requestedByName,
        summaryMessageId: summaryMessage._id,
        rangeStart: lastSummaryCutoffDate,
        rangeEnd: lastMessageCreatedAt,
        requestedAt: summaryRequestedAt,
      };

      conversation.aiSummaries.push(summaryDoc);
      const maxStoredSummaries = 20;
      if (conversation.aiSummaries.length > maxStoredSummaries) {
        conversation.aiSummaries = conversation.aiSummaries.slice(-maxStoredSummaries);
      }
      conversation.aiSummary = summaryDoc;
      conversation.lastMessage = summaryMessage._id;
      conversation.lastMessageAt = summaryMessage.createdAt;
      conversation.markModified('aiSummaries');
      conversation.markModified('aiSummary');
      await conversation.save({ validateBeforeSave: false });

      const summaryMessagePayload = summaryMessage.toObject();

      emitConversationMessage(conversation, summaryMessagePayload);
      emitConversationEvent(conversation, 'summaryGenerated', {
        conversationId,
        summaryMessageId: summaryMessage._id,
      });

      const updatedSummaryHistory = buildSummaryResponseList(
        conversation.aiSummaries,
        conversation.aiSummary
      );
      const latestSummaryResponse = getLatestSummary(updatedSummaryHistory);

      return {
        summaryId: latestSummaryResponse?._id,
        summary: latestSummaryResponse?.text || aiSummary,
        messageCount:
          latestSummaryResponse?.messageCount ?? contextMessages.length,
        generatedAt:
          latestSummaryResponse?.generatedAt || summaryMessage.createdAt.toISOString(),
        requestedBy:
          latestSummaryResponse?.requestedBy ?? toStringOrNull(context.userId),
        requestedByName:
          latestSummaryResponse?.requestedByName ?? requestedByName,
        lastMessageCreatedAt:
          latestSummaryResponse?.lastMessageCreatedAt ||
          toISOStringOrNull(lastMessageCreatedAt),
        cached: false,
        summaryMessage: summaryMessagePayload,
        rangeStart:
          latestSummaryResponse?.rangeStart ||
          toISOStringOrNull(lastSummaryCutoffDate),
        rangeEnd:
          latestSummaryResponse?.rangeEnd ||
          toISOStringOrNull(lastMessageCreatedAt),
        requestedAt:
          latestSummaryResponse?.requestedAt ||
          summaryMessage.createdAt.toISOString(),
      };
    },
  },

  Mutation: {
    createConversation: async (_, { participantId, participantIds, name, type }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const userId = context.userId;
      console.log('💬 Creating conversation:', { participantId, participantIds, name, type, userId });

      if (participantId) {
        const participant = await User.findById(participantId);
        if (!participant) {
          throw new Error('Participant not found');
        }

        const allOneToOneConversations = await Conversation.find({
          type: 'one-to-one',
          participants: { $size: 2 }
        })
          .populate('participants', 'name email avatarUrl isOnline lastSeen')
          .populate('lastMessage')
          .lean();
        
        const existingConversation = allOneToOneConversations.find(conv => {
          const participantIds = conv.participants.map(p => 
            p._id ? p._id.toString() : (p.toString ? p.toString() : String(p))
          );
          const userIdStr = userId.toString();
          const participantIdStr = participantId.toString();
          
          return participantIds.length === 2 &&
                 participantIds.includes(userIdStr) &&
                 participantIds.includes(participantIdStr);
        });

        if (existingConversation) {
          return normalizeConversation(existingConversation, userId, 0);
        }

        const conversation = new Conversation({
          participants: [userId, participantId],
          type: 'one-to-one',
        });

        await conversation.save();
        await conversation.populate('participants', 'name email avatarUrl isOnline lastSeen');
        await conversation.populate('lastMessage');

        const normalized = normalizeConversation(conversation.toObject(), userId, 0);
        console.log('✅ Created one-to-one conversation:', normalized.id);
        return normalized;
      }

      if (participantIds && Array.isArray(participantIds)) {
        if (!name || !name.trim()) {
          throw new Error('Group name is required');
        }
        
        if (participantIds.length < 1) {
          throw new Error('At least one participant is required for group chat');
        }

        const allParticipants = [userId, ...participantIds];

        const participants = await User.find({ _id: { $in: allParticipants } });
        if (participants.length !== allParticipants.length) {
          throw new Error('One or more participants not found');
        }

        const conversation = new Conversation({
          participants: allParticipants,
          type: 'group',
          name: name.trim(),
          createdBy: userId,
          admins: [userId],
        });

        await conversation.save();
        await conversation.populate('participants', 'name email avatarUrl isOnline lastSeen');
        await conversation.populate('createdBy', 'name email avatarUrl');
        await conversation.populate('admins', 'name email avatarUrl');
        await conversation.populate('lastMessage');

        const normalized = normalizeConversation(conversation.toObject(), userId, 0);
        console.log('✅ Created group conversation:', normalized.id, normalized.name);
        return normalized;
      }

      throw new Error('Either participantId or participantIds array is required');
    },

    deleteConversation: async (_, { conversationId }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const userId = context.userId?.toString?.() ?? context.userId;

      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      const conversation = await Conversation.findById(conversationId)
        .populate('participants', '_id')
        .populate('admins', '_id')
        .populate('createdBy', '_id');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const userIdStr = userId?.toString?.() ?? String(userId);

      const isParticipant = (conversation.participants || []).some((participant) => {
        if (!participant) return false;
        if (participant._id) {
          return participant._id.toString() === userIdStr;
        }
        if (participant.toString) {
          return participant.toString() === userIdStr;
        }
        return false;
      });

      if (!isParticipant) {
        throw new Error('Access denied');
      }

      if (conversation.type === 'group') {
        const isAdmin = (conversation.admins || []).some((admin) => {
          if (!admin) return false;
          if (admin._id) {
            return admin._id.toString() === userIdStr;
          }
          if (admin.toString) {
            return admin.toString() === userIdStr;
          }
          return false;
        });

        const isCreator = (() => {
          const creator = conversation.createdBy;
          if (!creator) return false;
          if (creator._id) {
            return creator._id.toString() === userIdStr;
          }
          if (creator.toString) {
            return creator.toString() === userIdStr;
          }
          return false;
        })();

        if (!isAdmin && !isCreator) {
          throw new Error('Only group admins can delete this conversation');
        }
      }

      const conversationIdStr = conversation._id.toString();
      const conversationForEvent = {
        participants: (conversation.participants || []).map((participant) => {
          if (participant && participant._id) {
            return { _id: participant._id };
          }
          return participant;
        }),
      };

      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.deleteOne({ _id: conversation._id });

      emitConversationEvent(conversationForEvent, 'conversationDeleted', {
        conversationId: conversationIdStr,
        deletedBy: userIdStr,
      });

      return true;
    },
  },
};

