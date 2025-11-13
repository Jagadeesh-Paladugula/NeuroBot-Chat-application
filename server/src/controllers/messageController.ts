import { Request, Response } from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { conversationId, text, attachments } = req.body;

    if (!conversationId) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    if (!text && (!attachments || attachments.length === 0)) {
      res.status(400).json({ error: 'Message text or attachments are required' });
      return;
    }

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    if (!conversation.participants.includes(userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId: userId,
      text: text || '',
      attachments: attachments || [],
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('senderId', 'name email avatarUrl');

    res.status(201).json({ message });
  } catch (error: any) {
    console.error('Create message error:', error);
    res.status(500).json({ error: error.message || 'Failed to create message' });
  }
};

