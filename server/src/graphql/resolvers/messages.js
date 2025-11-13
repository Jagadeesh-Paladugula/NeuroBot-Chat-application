import Message from '../../models/Message.js';
import Conversation from '../../models/Conversation.js';

export const messageResolvers = {
  Mutation: {
    createMessage: async (_, { conversationId, text, attachments }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      if (!text && (!attachments || attachments.length === 0)) {
        throw new Error('Message text or attachments are required');
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (!conversation.participants.includes(context.userId)) {
        throw new Error('Access denied');
      }

      const message = new Message({
        conversationId,
        senderId: context.userId,
        text: text || '',
        attachments: attachments || [],
      });

      await message.save();

      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      await message.populate('senderId', 'name email avatarUrl');
      await message.populate('parentMessageId', 'text senderId');
      await message.populate('mentions', 'name email');

      // Normalize message data
      const messageObj = message.toObject();
      if (messageObj.senderId) {
        const senderId = messageObj.senderId._id ? messageObj.senderId._id.toString() : String(messageObj.senderId);
        messageObj.senderId = {
          id: senderId,
          _id: senderId,
          name: messageObj.senderId.name,
          email: messageObj.senderId.email,
          avatarUrl: messageObj.senderId.avatarUrl,
        };
      }

      return messageObj;
    },
  },
};

