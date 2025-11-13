import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import User from '../../models/User.js';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import UserActivity from '../../models/UserActivity.js';
import { generateToken } from '../../utils/auth.js';

dotenv.config();

let googleClient = null;
let cachedGoogleClientId = null;

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  if (!googleClient || cachedGoogleClientId !== clientId) {
    googleClient = new OAuth2Client(clientId);
    cachedGoogleClientId = clientId;
  }

  return googleClient;
};

const createAssistantConversationForUser = async (user) => {
  try {
    const assistant = await User.findOne({ email: 'assistant@demo.com' });
    if (!assistant) {
      return;
    }

    const conversation = new Conversation({
      participants: [user._id, assistant._id],
    });
    await conversation.save();

    const welcomeMessage = new Message({
      conversationId: conversation._id,
      senderId: assistant._id,
      text: `Hello ${user.name}! I'm your AI assistant. I'm here to help you with questions, provide information, and have conversations. Feel free to ask me anything!`,
      metadata: { isAIMessage: true },
    });
    await welcomeMessage.save();

    conversation.lastMessage = welcomeMessage._id;
    conversation.lastMessageAt = welcomeMessage.createdAt;
    await conversation.save();
  } catch (assistantError) {
    console.warn('Could not create conversation with assistant:', assistantError.message);
  }
};

const addUserToTourTripPlanningGroup = async (user) => {
  try {
    let tourGroup = await Conversation.findOne({
      type: 'group',
      name: 'Tour Trip Planning',
    });

    if (!tourGroup) {
      const assistant = await User.findOne({ email: 'assistant@demo.com' });
      const participants = [user._id];
      
      if (assistant) {
        participants.push(assistant._id);
      }

      if (participants.length < 2) {
        console.warn('Could not create Tour Trip Planning group: Need at least 2 participants. AI assistant may not be available yet.');
        return;
      }

      tourGroup = new Conversation({
        type: 'group',
        name: 'Tour Trip Planning',
        participants: participants,
        createdBy: user._id,
        admins: [user._id],
      });
      await tourGroup.save();
      console.log(`✅ Created "Tour Trip Planning" group and added user: ${user.name} (${user.email})`);
    } else {
      const userId = user._id;
      const isParticipant = tourGroup.participants.some(
        (p) => {
          const participantId = p._id || p;
          return participantId.toString() === userId.toString();
        }
      );

      if (!isParticipant) {
        tourGroup.participants.push(userId);
        await tourGroup.save();
        console.log(`✅ Added user to "Tour Trip Planning" group: ${user.name} (${user.email})`);
      }
    }
  } catch (error) {
    console.warn('Could not add user to Tour Trip Planning group:', error.message);
  }
};

export const authResolvers = {
  Mutation: {
    register: async (_, { name, email, password }, context) => {
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      const user = new User({
        name,
        email,
        passwordHash: password,
      });

      await user.save();

      await createAssistantConversationForUser(user);
      await addUserToTourTripPlanningGroup(user);

      const token = generateToken(user._id);

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          about: user.about,
          readReceiptsEnabled: user.readReceiptsEnabled,
          isAdmin: user.isAdmin,
        },
        message: 'User created successfully',
      };
    },

    login: async (_, { email, password }, context) => {
      console.log('🔐 Login resolver called:', { email, hasPassword: !!password });
      
      if (!email || !password) {
        console.error('❌ Missing email or password');
        throw new Error('Email and password are required');
      }

      const user = await User.findOne({ email });
      if (!user) {
        console.error('❌ User not found:', email);
        throw new Error('Invalid credentials');
      }

      console.log('👤 User found:', { id: user._id, email: user.email, isDemo: user.isDemo });

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        console.error('❌ Invalid password for user:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ Password valid, updating lastSeen');
      user.lastSeen = new Date();
      await user.save();

      // Track login activity
      try {
        await UserActivity.create({
          userId: user._id,
          activityType: 'login',
          metadata: {},
          timestamp: new Date(),
        });
        console.log('📊 Login activity tracked for user:', user.email);
      } catch (activityError) {
        console.warn('Failed to track login activity:', activityError);
        // Don't fail login if activity tracking fails
      }

      const token = generateToken(user._id);
      console.log('🎟️ Token generated for user:', user._id);

      const result = {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isDemo: user.isDemo,
          phone: user.phone,
          about: user.about,
          readReceiptsEnabled: user.readReceiptsEnabled,
          isAdmin: user.isAdmin,
        },
        message: 'Login successful',
      };
      
      console.log('✅ Login successful, returning result');
      return result;
    },

    googleLogin: async (_, { credential }, context) => {
      const client = getGoogleClient();
      if (!client) {
        throw new Error('Google OAuth is not configured on the server');
      }

      if (!credential) {
        throw new Error('Google credential is required');
      }

      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Unable to verify Google credential');
      }

      const { sub: googleId, email, name, picture } = payload;
      if (!email) {
        throw new Error('Google account does not have an email address');
      }

      let user = await User.findOne({ email });
      const isNewUser = !user;

      if (!user) {
        user = new User({
          name: name || email.split('@')[0],
          email,
          provider: 'google',
          providerId: googleId,
          avatarUrl: picture || '',
        });
      } else {
        if (user.provider !== 'google') {
          user.provider = 'google';
        }
        user.providerId = googleId;
        if (!user.avatarUrl && picture) {
          user.avatarUrl = picture;
        }
        if (!user.name && name) {
          user.name = name;
        }
      }

      user.lastSeen = new Date();
      await user.save();

      // Track login activity
      try {
        await UserActivity.create({
          userId: user._id,
          activityType: 'login',
          metadata: { provider: 'google' },
          timestamp: new Date(),
        });
        console.log('📊 Google login activity tracked for user:', user.email);
      } catch (activityError) {
        console.warn('Failed to track Google login activity:', activityError);
        // Don't fail login if activity tracking fails
      }

      if (isNewUser) {
        await createAssistantConversationForUser(user);
        await addUserToTourTripPlanningGroup(user);
      }

      const token = generateToken(user._id);

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isDemo: user.isDemo,
          phone: user.phone,
          about: user.about,
          readReceiptsEnabled: user.readReceiptsEnabled,
          isAdmin: user.isAdmin,
        },
        message: 'Login successful',
      };
    },

    updateProfile: async (_, { name, avatarUrl, phone, about, readReceiptsEnabled }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const user = await User.findById(context.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (name !== undefined && name.trim() !== '') {
        user.name = name.trim();
      }

      if (avatarUrl !== undefined) {
        user.avatarUrl = avatarUrl;
      }

      if (phone !== undefined) {
        user.phone = typeof phone === 'string' ? phone.trim() : '';
      }

      if (about !== undefined) {
        user.about = typeof about === 'string' ? about.trim() : '';
      }

      if (readReceiptsEnabled !== undefined) {
        user.readReceiptsEnabled = Boolean(readReceiptsEnabled);
      }

      await user.save();

      // Track profile update activity
      try {
        await UserActivity.create({
          userId: user._id,
          activityType: 'profile_updated',
          metadata: {
            fieldsUpdated: [
              name !== undefined ? 'name' : null,
              avatarUrl !== undefined ? 'avatarUrl' : null,
              phone !== undefined ? 'phone' : null,
              about !== undefined ? 'about' : null,
              readReceiptsEnabled !== undefined ? 'readReceiptsEnabled' : null,
            ].filter(Boolean),
          },
          timestamp: new Date(),
        });
      } catch (activityError) {
        console.warn('Failed to track profile update activity:', activityError);
        // Don't fail profile update if activity tracking fails
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        lastSeen: user.lastSeen,
        isDemo: user.isDemo,
        isOnline: user.isOnline,
        phone: user.phone,
        about: user.about,
        readReceiptsEnabled: user.readReceiptsEnabled,
        isAdmin: user.isAdmin,
      };
    },

    deleteAccount: async (_, __, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const userId = context.userId;
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await Message.deleteMany({ senderId: userId });

      await Conversation.updateMany(
        { participants: userId },
        {
          $pull: {
            participants: userId,
            admins: userId,
          },
        }
      );

      const orphanedConversationIds = await Conversation.find({
        $or: [
          { participants: { $size: 0 } },
          {
            $and: [
              { type: 'one-to-one' },
              { $expr: { $lt: [{ $size: '$participants' }, 2] } },
            ],
          },
        ],
      }).select('_id');

      if (orphanedConversationIds.length > 0) {
        const idsToDelete = orphanedConversationIds.map((conv) => conv._id);
        await Conversation.deleteMany({ _id: { $in: idsToDelete } });
        await Message.deleteMany({ conversationId: { $in: idsToDelete } });
      }

      await User.findByIdAndDelete(userId);

      return true;
    },
  },

  Query: {
    me: async (_, __, context) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const user = await User.findById(context.userId).select('-passwordHash');
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        lastSeen: user.lastSeen,
        isDemo: user.isDemo,
        isOnline: user.isOnline,
        phone: user.phone,
        about: user.about,
        readReceiptsEnabled: user.readReceiptsEnabled,
        isAdmin: user.isAdmin,
      };
    },
  },
};

