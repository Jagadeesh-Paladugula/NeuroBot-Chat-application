import { verifyToken } from '../utils/auth.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { sendToAssistant, getAssistantUserId } from '../services/gemini.js';
import { sanitizeValue } from '../middleware/sanitizeInput.js';
import logger from '../utils/logger.js';
import { SOCKET_EVENTS, MESSAGE_STATUS } from '../constants/index.js';

// Store active users: userId -> Set of socketIds
const activeUsers = new Map();
let ioInstance = null;

const getSocketIdsForUser = (userId) => {
  if (!userId) return null;
  const key = userId.toString();
  return activeUsers.get(key) || activeUsers.get(userId) || null;
};

const emitToUsers = (userIds, eventName, payload) => {
  if (!ioInstance || !Array.isArray(userIds)) return;

  userIds.forEach((id) => {
    const sockets = getSocketIdsForUser(id);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      ioInstance.to(socketId).emit(eventName, payload);
    });
  });
};

export const emitConversationMessage = (conversation, messagePayload) => {
  if (!conversation || !messagePayload) return;
  const participants = (conversation.participants || []).map((participant) =>
    participant?._id ? participant._id.toString() : participant?.toString?.()
  );
  emitToUsers(participants, SOCKET_EVENTS.GET_MESSAGE, { message: messagePayload });
};

export const emitConversationEvent = (conversation, eventName, payload) => {
  if (!conversation || !eventName) return;
  const participants = (conversation.participants || []).map((participant) =>
    participant?._id ? participant._id.toString() : participant?.toString?.()
  );
  emitToUsers(participants, eventName, payload);
};

export const initializeSocket = (io) => {
  ioInstance = io;
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.userId;

    logger.info(`User connected: ${userId} (socket: ${socket.id})`);

    // Add user to active users
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Mark user as online
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch((err) => {
      logger.error('Error updating user online status:', err);
    });

    // Emit user online to all sockets
    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId });

    // Register user
    socket.emit(SOCKET_EVENTS.CONNECTED, { userId, socketId: socket.id });

    // Handle addUser (redundant but kept for compatibility)
    socket.on(SOCKET_EVENTS.ADD_USER, (data) => {
      logger.debug(`User ${userId} registered via addUser`);
      socket.emit(SOCKET_EVENTS.USER_ADDED, { userId });
    });

    // Handle sendMessage
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (incomingData = {}) => {
      try {
        // Log raw incoming data for debugging
        logger.info('📥 Raw incoming data:', {
          hasAttachments: !!incomingData.attachments,
          attachmentsType: typeof incomingData.attachments,
          attachmentsIsArray: Array.isArray(incomingData.attachments),
          attachmentsValue: typeof incomingData.attachments === 'string' 
            ? incomingData.attachments.substring(0, 200) 
            : incomingData.attachments,
          conversationId: incomingData.conversationId,
        });
        
        // Extract attachments BEFORE sanitization to prevent string conversion
        let attachments = incomingData.attachments;
        
        // CRITICAL: If attachments is undefined or null, set to empty array immediately
        if (attachments === undefined || attachments === null) {
          attachments = [];
        }
        
        // Remove attachments from incomingData before sanitization
        const { attachments: _, ...dataWithoutAttachments } = incomingData;
        
        // Handle case where attachments might be a string
        if (typeof attachments === 'string') {
          logger.warn('⚠️ Attachments received as string. Raw value:', attachments.substring(0, 300));
          
          try {
            // First try to parse as JSON
            attachments = JSON.parse(attachments);
            logger.info('✅ Parsed attachments as JSON');
          } catch (e) {
            // If JSON.parse fails, try to extract from the string concatenation format
            // Format: "[\n' +\n  '  {\n' +\n  \"    url: '...',\n\" + ..."
            try {
              // Step 1: Remove all string concatenation syntax
              // The format is: "[\n' +\n  '  {\n' +\n  \"    url: '...',\n\" + ..."
              let cleaned = attachments
                // Remove all ' + ' or " + " patterns (with any whitespace)
                .replace(/\s*['"]\s*\+\s*['"]\s*/g, '')
                // Remove escaped newlines and convert to actual newlines
                .replace(/\\n/g, '\n')
                // Remove escaped quotes
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'");
              
              // Step 2: Remove outer quotes if the entire string is quoted
              cleaned = cleaned.trim();
              // Check if it starts and ends with matching quotes
              if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                  (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                // Remove outer quotes
                cleaned = cleaned.slice(1, -1);
              }
              
              // Step 3: Extract array content - find the actual array structure
              const arrayStart = cleaned.indexOf('[');
              const arrayEnd = cleaned.lastIndexOf(']');
              if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
              }
              
              // Step 4: Convert JavaScript object syntax to JSON
              // Pattern: url: 'value' or url: "value" -> "url": "value"
              // Handle single quotes first
              cleaned = cleaned.replace(/(\w+):\s*'([^']*)'/g, '"$1": "$2"');
              // Handle double quotes (already quoted values) - but be careful not to double-quote
              cleaned = cleaned.replace(/(\w+):\s*"([^"]*)"/g, '"$1": "$2"');
              
              // Step 5: Clean up whitespace more aggressively
              // Remove all newlines and extra spaces, make it a single line
              cleaned = cleaned.replace(/\s+/g, ' ').trim();
              
              logger.info('🧹 Cleaned string (first 300 chars):', cleaned.substring(0, 300));
              logger.info('🧹 Cleaned string (full length):', cleaned.length);
              
              // Step 6: Try parsing as JSON
              try {
                attachments = JSON.parse(cleaned);
                logger.info('✅ Successfully parsed attachments from string concatenation format');
                logger.info('✅ Parsed result:', JSON.stringify(attachments));
              } catch (parseError) {
                // If still fails, try one more approach - manually construct the object
                logger.warn('⚠️ JSON.parse still failed, trying manual extraction...');
                const urlMatch = cleaned.match(/url["\s:]+["']([^"']+)["']/);
                const typeMatch = cleaned.match(/type["\s:]+["']([^"']+)["']/);
                const nameMatch = cleaned.match(/name["\s:]+["']([^"']+)["']/);
                
                if (urlMatch && typeMatch) {
                  const manualAtt = {
                    url: urlMatch[1],
                    type: typeMatch[1],
                    name: nameMatch ? nameMatch[1] : undefined,
                  };
                  attachments = [manualAtt];
                  logger.info('✅ Manually extracted attachment:', manualAtt);
                } else {
                  throw parseError;
                }
              }
            } catch (e2) {
              logger.error('❌ Failed to parse attachments string');
              logger.error('Original value:', attachments);
              logger.error('Parse error 1 (JSON):', e.message);
              logger.error('Parse error 2 (String cleanup):', e2.message);
              attachments = [];
            }
          }
        }
        
        // Ensure attachments is an array
        if (!Array.isArray(attachments)) {
          if (attachments && typeof attachments === 'object' && !Array.isArray(attachments)) {
            // Single object, wrap in array
            attachments = [attachments];
          } else if (typeof attachments === 'string') {
            // Still a string after parsing attempt - this shouldn't happen, but handle it
            logger.error('❌ Attachments is still a string after parsing attempt!', attachments.substring(0, 200));
            attachments = [];
          } else {
            attachments = [];
          }
        }
        
        // CRITICAL: Check if array contains any strings (which would indicate parsing failed)
        const hasStringElements = attachments.some(att => typeof att === 'string');
        if (hasStringElements) {
          logger.error('❌ Attachments array contains string elements! Attempting to parse each element...');
          attachments = attachments.map(att => {
            if (typeof att === 'string') {
              try {
                return JSON.parse(att);
              } catch (e) {
                logger.error('Failed to parse string attachment:', att.substring(0, 100));
                return null;
              }
            }
            return att;
          }).filter(att => att !== null);
        }
        
        // Validate and normalize attachment structure
        attachments = attachments
          .filter(att => {
            // Filter out invalid attachments
            if (!att) return false;
            
            // Handle string format
            if (typeof att === 'string') {
              try {
                att = JSON.parse(att);
              } catch {
                return false;
              }
            }
            
            // Must be an object with url and type
            if (typeof att !== 'object' || Array.isArray(att)) return false;
            return att.url && att.type;
          })
          .map(att => {
            // Normalize to ensure proper structure
            if (typeof att === 'string') {
              try {
                att = JSON.parse(att);
              } catch {
                return null;
              }
            }
            
            // Ensure it's a plain object
            if (typeof att !== 'object' || Array.isArray(att)) {
              return null;
            }
            
            return {
              url: String(att.url || ''),
              type: String(att.type || 'image'),
              name: att.name ? String(att.name) : undefined,
            };
          })
          .filter(att => att !== null); // Remove any null entries
        
        logger.info('✅ Processed attachments:', {
          count: attachments.length,
          attachments: attachments,
        });

        // Sanitize other fields (attachments already removed)
        const sanitizedData = sanitizeValue(dataWithoutAttachments);
        const { conversationId, text, parentMessageId, mentions } = sanitizedData;
        
        // Combine sanitized data with validated attachments
        const data = { ...sanitizedData, attachments };

        logger.info('📨 Received sendMessage event', {
          conversationId,
          hasText: !!text,
          textLength: text?.length || 0,
          attachmentsCount: attachments.length,
          attachments: attachments,
        });

        if (!conversationId) {
          logger.warn('❌ Missing conversationId');
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Conversation ID is required' });
          return;
        }

        const hasText = text && text.trim().length > 0;
        const hasAttachments = attachments.length > 0;

        if (!hasText && !hasAttachments) {
          logger.warn('❌ No text or attachments provided');
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Message text or attachments are required' });
          return;
        }

        // Verify user is a participant
        const conversation = await Conversation.findById(conversationId).populate('participants');
        if (!conversation) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p._id.toString() === userId.toString()
        );
        if (!isParticipant) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Access denied' });
          return;
        }

        // Extract mentions from text (@username pattern)
        let extractedMentions = [];
        if (text) {
          const mentionPattern = /@(\w+)/g;
          const matches = text.match(mentionPattern);
          if (matches) {
            const usernames = matches.map(m => m.substring(1)); // Remove @
            const mentionedUsers = await User.find({ 
              name: { $in: usernames },
              _id: { $in: conversation.participants.map(p => p._id || p) }
            });
            extractedMentions = mentionedUsers.map(u => u._id);
          }
        }

        // Combine extracted mentions with provided mentions
        const allMentions = [...new Set([
          ...(extractedMentions || []),
          ...(mentions || [])
        ].map(id => id.toString()))];

        // Create and save message
        // Ensure text is empty string if not provided and we have attachments
        const messageText = hasText ? (text || '').trim() : '';
        
        // Final validation: ensure attachments is a proper array of objects
        const finalAttachments = Array.isArray(attachments) 
          ? attachments
              .filter(att => {
                // Must be an object (not string, not array, not null)
                if (!att || typeof att !== 'object' || Array.isArray(att)) {
                  logger.warn('⚠️ Invalid attachment filtered out:', att);
                  return false;
                }
                // Must have url and type
                if (!att.url || !att.type) {
                  logger.warn('⚠️ Attachment missing url or type:', att);
                  return false;
                }
                return true;
              })
              .map(att => {
                // Ensure it's a plain object with the correct structure
                return {
                  url: String(att.url),
                  type: String(att.type),
                  name: att.name ? String(att.name) : undefined,
                };
              })
          : [];
        
        logger.info('💾 Creating message with:', {
          text: messageText,
          textLength: messageText.length,
          attachmentsCount: finalAttachments.length,
          attachments: finalAttachments,
          attachmentsType: typeof finalAttachments,
          attachmentsIsArray: Array.isArray(finalAttachments),
          hasText,
          hasAttachments: finalAttachments.length > 0,
        });
        
        // Double-check: ensure finalAttachments is an array of plain objects
        if (!Array.isArray(finalAttachments)) {
          logger.error('❌ finalAttachments is not an array!', typeof finalAttachments, finalAttachments);
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid attachments format' });
          return;
        }
        
        // Triple-check: verify each attachment is a plain object, not a string
        for (let i = 0; i < finalAttachments.length; i++) {
          const att = finalAttachments[i];
          if (typeof att === 'string') {
            logger.error(`❌ Attachment at index ${i} is a string!`, att);
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid attachment format: attachments must be objects, not strings' });
            return;
          }
          if (!att || typeof att !== 'object' || Array.isArray(att)) {
            logger.error(`❌ Attachment at index ${i} is invalid!`, att);
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid attachment format' });
            return;
          }
        }
        
        // Create a fresh array with plain objects to avoid any reference issues
        const cleanAttachments = finalAttachments.map(att => ({
          url: String(att.url || ''),
          type: String(att.type || 'image'),
          name: att.name ? String(att.name) : undefined,
        }));
        
        logger.info('✅ Final clean attachments:', {
          count: cleanAttachments.length,
          attachments: cleanAttachments,
          isArray: Array.isArray(cleanAttachments),
          firstElementType: cleanAttachments.length > 0 ? typeof cleanAttachments[0] : 'N/A',
        });
        
        // FINAL SAFETY CHECK: Verify no strings in the array
        const hasAnyStrings = cleanAttachments.some(att => typeof att === 'string');
        if (hasAnyStrings) {
          logger.error('❌ CRITICAL: cleanAttachments still contains strings!', cleanAttachments);
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid attachment format: cannot send message with string attachments' });
          return;
        }
        
        // Verify all are objects
        const allAreObjects = cleanAttachments.every(att => att && typeof att === 'object' && !Array.isArray(att));
        if (!allAreObjects && cleanAttachments.length > 0) {
          logger.error('❌ CRITICAL: cleanAttachments contains non-objects!', cleanAttachments);
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid attachment format' });
          return;
        }
        
        // Create a completely fresh object to avoid any reference issues
        const messageData = {
          conversationId,
          senderId: userId,
          text: messageText,
          attachments: JSON.parse(JSON.stringify(cleanAttachments)), // Deep clone to ensure clean objects
          parentMessageId: parentMessageId || null,
          mentions: allMentions,
        };
        
        logger.info('📤 Creating Message with data:', {
          conversationId: messageData.conversationId,
          text: messageData.text,
          attachmentsCount: messageData.attachments.length,
          attachments: messageData.attachments,
        });
        
        const message = new Message(messageData);

        logger.info('💾 Saving message', {
          text: message.text,
          attachmentsCount: message.attachments.length,
          attachments: message.attachments,
        });

        await message.save();
        logger.info('✅ Message saved successfully', { messageId: message._id });
        await message.populate('senderId', 'name email avatarUrl');
        await message.populate('parentMessageId', 'text senderId');
        await message.populate('mentions', 'name email');

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Emit to all participants
        const participantIds = conversation.participants.map((p) => 
          p._id ? p._id.toString() : p.toString()
        );
        participantIds.forEach((participantId) => {
          const userSockets = activeUsers.get(participantId);
          if (userSockets) {
            userSockets.forEach((socketId) => {
              io.to(socketId).emit(SOCKET_EVENTS.GET_MESSAGE, { message });
            });
          }
        });
        
        // Mark message as delivered for recipients (not sender)
        const recipientIds = participantIds.filter(id => id !== userId.toString());
        setTimeout(async () => {
          recipientIds.forEach(async (recipientId) => {
            const userSockets = activeUsers.get(recipientId);
            if (userSockets && userSockets.size > 0) {
              // User is online, mark as delivered
              await Message.findByIdAndUpdate(message._id, { status: MESSAGE_STATUS.DELIVERED });
              const senderSockets = activeUsers.get(userId);
              if (senderSockets) {
                senderSockets.forEach((socketId) => {
                  io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, {
                    messageId: message._id,
                    status: MESSAGE_STATUS.DELIVERED,
                  });
                });
              }
            }
          });
        }, 100);

        // Check if message is for AI assistant (@ai or conversation with assistant)
        const assistantId = await getAssistantUserId();
        const assistantIdStr = assistantId ? assistantId.toString() : null;
        const isAIMessage = text.toLowerCase().includes('@ai') || 
                           (assistantIdStr && participantIds.includes(assistantIdStr));

        if (isAIMessage) {
          // Get recent messages for context
          const recentMessages = await Message.find({ conversationId })
            .populate('senderId', 'name email')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
          recentMessages.reverse();

          // Extract prompt (remove @ai if present)
          const prompt = text.replace(/@ai/gi, '').trim() || text;

        // Send to Gemini AI
          try {
            const aiReply = await sendToAssistant({
              conversationId,
              prompt,
              contextMessages: recentMessages,
            });

            // Create AI message
            const aiMessage = new Message({
              conversationId,
              senderId: assistantId,
              text: aiReply,
              metadata: {
                isAIMessage: true,
                aiPrompt: prompt,
              },
            });

            await aiMessage.save();
            await aiMessage.populate('senderId', 'name email avatarUrl');

            // Update conversation
            conversation.lastMessage = aiMessage._id;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // Emit AI reply to all participants
            participantIds.forEach((participantId) => {
              const userSockets = activeUsers.get(participantId);
              if (userSockets) {
                userSockets.forEach((socketId) => {
                  io.to(socketId).emit('getMessage', { message: aiMessage });
                });
              }
            });
          } catch (aiError) {
            logger.error('AI assistant error:', aiError);
            
            // Use user-friendly error message if available, otherwise create one
            let errorText = aiError.userMessage || aiError.message || 'Sorry, I encountered an error. Please try again.';
            
            // Handle specific error cases
            if (aiError.message?.includes('not configured')) {
              errorText = 'AI assistant is not configured. Please set GEMINI_API_KEY in the server environment variables.';
            } else if (aiError.code === 'insufficient_quota' || aiError.type === 'insufficient_quota') {
              errorText = 'AI assistant is temporarily unavailable due to quota limits. Please review your Gemini usage limits or contact the administrator.';
            } else if (aiError.status === 429) {
              errorText = 'AI assistant is receiving too many requests. Please try again in a moment.';
            } else if (aiError.status === 401) {
              errorText = 'AI assistant authentication failed. Please check the API configuration.';
            }
            
            const errorMessage = new Message({
              conversationId,
              senderId: assistantId,
              text: errorText,
              metadata: { isAIMessage: true },
            });
            await errorMessage.save();
            await errorMessage.populate('senderId', 'name email avatarUrl');
            
            participantIds.forEach((participantId) => {
              const userSockets = activeUsers.get(participantId);
              if (userSockets) {
                userSockets.forEach((socketId) => {
                  io.to(socketId).emit('getMessage', { message: errorMessage });
                });
              }
            });
          }
        }
      } catch (error) {
        logger.error('Send message error:', error);
        socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on(SOCKET_EVENTS.TYPING, async (incomingData = {}) => {
      try {
        const { conversationId, isTyping } = sanitizeValue({ ...incomingData });

        if (!conversationId) return;

        // Get conversation participants
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const participantIds = conversation.participants
          .map((p) => p._id ? p._id.toString() : p.toString())
          .filter((id) => id !== userId.toString());

        // Emit to other participants
        participantIds.forEach((participantId) => {
          const userSockets = activeUsers.get(participantId);
          if (userSockets) {
            userSockets.forEach((socketId) => {
              io.to(socketId).emit(SOCKET_EVENTS.TYPING, {
                conversationId,
                userId,
                isTyping,
              });
            });
          }
        });
      } catch (error) {
        logger.error('Typing indicator error:', error);
      }
    });

    // Handle message delivered
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async (incomingData = {}) => {
      try {
        const { messageId } = sanitizeValue({ ...incomingData });
        if (!messageId) return;

        await Message.findByIdAndUpdate(messageId, { status: MESSAGE_STATUS.DELIVERED });

        // Emit to sender
        const message = await Message.findById(messageId).populate('senderId');
        if (message && message.senderId) {
          const senderSockets = activeUsers.get(message.senderId._id.toString());
          if (senderSockets) {
            senderSockets.forEach((socketId) => {
              io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, {
                messageId,
                status: MESSAGE_STATUS.DELIVERED,
                conversationId: message.conversationId?.toString?.() || message.conversationId,
              });
            });
          }
        }
      } catch (error) {
        logger.error('Message delivered error:', error);
      }
    });

    // Handle message seen
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async (incomingData = {}) => {
      try {
        const { messageId, conversationId } = sanitizeValue({ ...incomingData });
        if (!messageId || !conversationId) return;

        await Message.findByIdAndUpdate(messageId, { status: MESSAGE_STATUS.SEEN });

        // Emit to sender
        const message = await Message.findById(messageId).populate('senderId');
        if (message && message.senderId) {
          const senderSockets = activeUsers.get(message.senderId._id.toString());
          if (senderSockets) {
            senderSockets.forEach((socketId) => {
              io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, {
                messageId,
                status: MESSAGE_STATUS.SEEN,
                conversationId: message.conversationId?.toString?.() || message.conversationId,
              });
            });
          }
        }
      } catch (error) {
        logger.error('Message seen error:', error);
      }
    });

    // Handle summaryGenerated
    socket.on(SOCKET_EVENTS.SUMMARY_GENERATED, async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        const conversation = await Conversation.findById(conversationId).select(
          'participants'
        );
        if (!conversation) return;

        const participantIds = conversation.participants.map((p) =>
          p?._id ? p._id.toString() : p.toString()
        );

        participantIds.forEach((participantId) => {
          const userSockets = activeUsers.get(participantId);
          if (userSockets) {
            userSockets.forEach((socketId) => {
              io.to(socketId).emit(SOCKET_EVENTS.SUMMARY_GENERATED, { conversationId });
            });
          }
        });
      } catch (error) {
        logger.error('Summary broadcast error:', error);
      }
    });

    // Handle disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      logger.info(`User disconnected: ${userId} (socket: ${socket.id})`);

      // Remove socket from active users
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          // Mark user as offline
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          
          // Track logout activity (only when all sockets are disconnected)
          try {
            const UserActivity = (await import('../models/UserActivity.js')).default;
            await UserActivity.create({
              userId: userId,
              activityType: 'logout',
              metadata: {},
              timestamp: new Date(),
            });
            logger.info(`📊 Logout activity tracked for user: ${userId}`);
          } catch (activityError) {
            logger.warn('Failed to track logout activity:', activityError);
            // Don't fail disconnect if activity tracking fails
          }
          
          // Emit user offline
          io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
        }
      }
    });
  });
};

