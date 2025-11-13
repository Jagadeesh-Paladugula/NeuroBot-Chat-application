import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendToAssistant, getAssistantUserId } from '../services/gemini.js';
import {
  emitConversationEvent,
  emitConversationMessage,
} from '../sockets/socketHandler.js';

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

export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('createdBy', 'name email avatarUrl')
      .populate('admins', 'name email avatarUrl')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Get unread message counts
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

    // Format conversations
    const formattedConversations = conversations.map((conv) => {
      const unreadCount = unreadCountsMap[conv._id.toString()] || 0;
      const summaries = buildSummaryResponseList(conv.aiSummaries, conv.aiSummary);
      const latestSummary = getLatestSummary(summaries);
      
      if (conv.type === 'one-to-one') {
        const otherParticipant = conv.participants.find(
          (p) => p && p._id && p._id.toString() !== userId.toString()
        );
        
        // Ensure participant is properly populated
        const participant = otherParticipant || conv.participants.find(p => p && p._id) || null;
        
        return {
          id: conv._id,
          type: conv.type,
          name: conv.name,
          participant: participant,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          aiSummaries: conv.aiSummaries || [],
          aiSummary: conv.aiSummary?.text
            ? {
                text: conv.aiSummary.text,
                messageCount: conv.aiSummary.messageCount,
                generatedAt: conv.aiSummary.generatedAt,
                requestedBy: conv.aiSummary.requestedBy,
                requestedByName: conv.aiSummary.requestedByName,
                lastMessageCreatedAt: conv.aiSummary.lastMessageCreatedAt,
              }
            : null,
        };
      } else {
        // Group conversation
        return {
          id: conv._id,
          type: conv.type,
          name: conv.name,
          participants: conv.participants,
          createdBy: conv.createdBy,
          admins: conv.admins || [],
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          aiSummaries: conv.aiSummaries || [],
          aiSummary: conv.aiSummary?.text
            ? {
                text: conv.aiSummary.text,
                messageCount: conv.aiSummary.messageCount,
                generatedAt: conv.aiSummary.generatedAt,
                requestedBy: conv.aiSummary.requestedBy,
                requestedByName: conv.aiSummary.requestedByName,
                lastMessageCreatedAt: conv.aiSummary.lastMessageCreatedAt,
              }
            : null,
        };
      }
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversations' });
  }
};

export const createConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { participantId, participantIds, name, type } = req.body;

    // Handle one-to-one conversation
    if (participantId) {
      // Check if participant exists
      const participant = await User.findById(participantId);
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      // Check if conversation already exists
      // First, get all one-to-one conversations with 2 participants
      const allOneToOneConversations = await Conversation.find({
        type: 'one-to-one',
        participants: { $size: 2 }
      })
        .populate('participants', 'name email avatarUrl isOnline lastSeen')
        .populate('lastMessage')
        .lean();
      
      // Find conversation that has both userId and participantId
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
        const otherParticipant = existingConversation.participants.find(
          (p) => {
            const pId = p._id ? p._id.toString() : (p.toString ? p.toString() : String(p));
            return pId !== userId.toString();
          }
        );
        const summaries = buildSummaryResponseList(
          existingConversation.aiSummaries,
          existingConversation.aiSummary
        );
        const latestSummary = getLatestSummary(summaries);
        return res.json({
          conversation: {
            id: existingConversation._id,
            type: existingConversation.type,
            name: existingConversation.name,
            participant: otherParticipant,
            participants: existingConversation.participants,
            lastMessage: existingConversation.lastMessage,
            lastMessageAt: existingConversation.lastMessageAt,
            createdAt: existingConversation.createdAt,
            updatedAt: existingConversation.updatedAt,
            aiSummaries: summaries,
            aiSummary: latestSummary,
          },
        });
      }

      // Create new one-to-one conversation
      const conversation = new Conversation({
        participants: [userId, participantId],
        type: 'one-to-one',
      });

      await conversation.save();
      await conversation.populate('participants', 'name email avatarUrl isOnline lastSeen');

      const otherParticipant = conversation.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      return res.status(201).json({
        conversation: {
          id: conversation._id,
          type: conversation.type,
          name: conversation.name,
          participant: otherParticipant,
          participants: conversation.participants,
          lastMessage: null,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          aiSummaries: [],
          aiSummary: null,
        },
      });
    }

    // Handle group conversation
    if (participantIds && Array.isArray(participantIds)) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }
      
      if (participantIds.length < 1) {
        return res.status(400).json({ error: 'At least one participant is required for group chat' });
      }

      // Add current user to participants
      const allParticipants = [userId, ...participantIds];

      // Check if all participants exist
      const participants = await User.find({ _id: { $in: allParticipants } });
      if (participants.length !== allParticipants.length) {
        return res.status(404).json({ error: 'One or more participants not found' });
      }

      // Create new group conversation
      const conversation = new Conversation({
        participants: allParticipants,
        type: 'group',
        name: name.trim(), // Use trimmed name (already validated)
        createdBy: userId,
        admins: [userId], // Creator is the admin
      });

      await conversation.save();
      await conversation.populate('participants', 'name email avatarUrl isOnline lastSeen');
      await conversation.populate('createdBy', 'name email avatarUrl');
      await conversation.populate('admins', 'name email avatarUrl');

      return res.status(201).json({
        conversation: {
          id: conversation._id,
          type: conversation.type,
          name: conversation.name,
          participants: conversation.participants,
          createdBy: conversation.createdBy,
          admins: conversation.admins,
          lastMessage: null,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          aiSummaries: [],
          aiSummary: null,
        },
      });
    }

    return res.status(400).json({ error: 'Either participantId or participantIds array is required' });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create conversation' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { id: conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const participantIds = conversation.participants.map((participant) => {
      if (!participant) {
        return null;
      }
      if (typeof participant === 'string') {
        return participant;
      }
      if (participant?._id) {
        return participant._id.toString();
      }
      if (participant.toString) {
        return participant.toString();
      }
      return String(participant);
    });

    if (!participantIds.includes(userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email avatarUrl')
      .populate('parentMessageId', 'text senderId')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    const summaryHistory = buildSummaryResponseList(
      conversation.aiSummaries,
      conversation.aiSummary
    );
    const latestSummary = getLatestSummary(summaryHistory);

    res.json({
      messages,
      summaries: summaryHistory,
      aiSummary: latestSummary,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId,
    }).select('_id').lean();

    const conversationIds = conversations.map(c => c._id);

    // Count unread messages (messages not seen by current user)
    // Convert userId to ObjectId for proper comparison
    const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
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

    // Convert to object format
    const countsObj = {};
    unreadCounts.forEach(item => {
      countsObj[item._id.toString()] = item.count;
    });

    res.json({ unreadCounts: countsObj });
  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get unread counts' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all users except the current user
    const users = await User.find({ _id: { $ne: userId } })
      .select('name email avatarUrl isOnline lastSeen isDemo')
      .sort({ name: 1 })
      .lean();

    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message || 'Failed to get users' });
  }
};

export const getConversationSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      'name email isDemo'
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const userIdStr = userId.toString();
    const isParticipant = conversation.participants.some((participant) => {
      const participantId =
        participant?._id?.toString() ||
        (typeof participant === 'string' ? participant : String(participant));
      return participantId === userIdStr;
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (conversation.type !== 'group') {
      return res
        .status(400)
        .json({ error: 'AI summaries are only available for group chats' });
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

      return res.json({
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
      });
    }

    if (messages.length === 0) {
      return res.json({
        summaryId: null,
        summary: 'No new messages since the last summary.',
        messageCount: 0,
        generatedAt: new Date().toISOString(),
        requestedBy: toStringOrNull(userId),
        requestedByName,
        cached: false,
        rangeStart: latestSummary?.rangeEnd ?? null,
        rangeEnd: latestSummary?.rangeEnd ?? null,
        requestedAt: new Date().toISOString(),
      });
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
      return res.json({
        summaryId: null,
        summary: 'Not enough message content to summarize yet.',
        messageCount: 0,
        generatedAt: new Date().toISOString(),
        requestedBy: toStringOrNull(userId),
        requestedByName,
      });
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
      senderId: assistantId || userId,
      text: aiSummary,
      metadata: {
        isAIMessage: true,
        isAISummary: true,
        summaryInfo: {
          requestedBy: userId,
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
      requestedBy: userId,
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

    res.json({
      summaryId: latestSummaryResponse?._id,
      summary: latestSummaryResponse?.text || aiSummary,
      messageCount:
        latestSummaryResponse?.messageCount ?? contextMessages.length,
      generatedAt:
        latestSummaryResponse?.generatedAt || summaryMessage.createdAt.toISOString(),
      requestedBy:
        latestSummaryResponse?.requestedBy ?? toStringOrNull(userId),
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
    });
  } catch (error) {
    console.error('Get conversation summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const userId = req.userId?.toString?.() ?? req.userId;
    const { id: conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', '_id')
      .populate('admins', '_id')
      .populate('createdBy', '_id');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
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
      return res.status(403).json({ error: 'Access denied' });
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
        return res.status(403).json({
          error: 'Only group admins can delete this conversation',
        });
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

    res.json({ success: true, conversationId: conversationIdStr });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete conversation' });
  }
};

