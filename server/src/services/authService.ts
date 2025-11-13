import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { generateToken } from '../utils/auth.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { AI_ASSISTANT, GROUP_NAMES } from '../constants/index.js';
import mongoose from 'mongoose';

let googleClient: OAuth2Client | null = null;
let cachedGoogleClientId: string | null = null;

const getGoogleClient = (): OAuth2Client | null => {
  const clientId = config.google.clientId;
  if (!clientId) {
    return null;
  }

  if (!googleClient || cachedGoogleClientId !== clientId) {
    googleClient = new OAuth2Client(clientId);
    cachedGoogleClientId = clientId;
  }

  return googleClient;
};

const createAssistantConversationForUser = async (user: any): Promise<void> => {
  try {
    const assistant = await User.findOne({ email: AI_ASSISTANT.EMAIL });
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
  } catch (assistantError: any) {
    logger.warn('Could not create conversation with assistant:', assistantError.message);
  }
};

const addUserToTourTripPlanningGroup = async (user: any): Promise<void> => {
  try {
    // Find the "Tour Trip Planning" group conversation
    let tourGroup = await Conversation.findOne({
      type: 'group',
      name: GROUP_NAMES.TOUR_TRIP_PLANNING,
    });

    if (!tourGroup) {
      // If group doesn't exist, create it with the user and AI assistant
      const assistant = await User.findOne({ email: AI_ASSISTANT.EMAIL });
      const participants: mongoose.Types.ObjectId[] = [user._id];

      if (assistant) {
        participants.push(assistant._id);
      }

      // Check if we have at least 2 participants (required by schema for groups)
      if (participants.length < 2) {
        logger.warn('Could not create Tour Trip Planning group: Need at least 2 participants. AI assistant may not be available yet.');
        return;
      }

      tourGroup = new Conversation({
        type: 'group',
        name: GROUP_NAMES.TOUR_TRIP_PLANNING,
        participants: participants,
        createdBy: user._id,
        admins: [user._id],
      });
      await tourGroup.save();
      logger.info(`✅ Created "Tour Trip Planning" group and added user: ${user.name} (${user.email})`);
    } else {
      // Group exists, check if user is already a participant
      const userId = user._id;
      const isParticipant = tourGroup.participants.some(
        (p) => {
          const participantId = p._id || p;
          return participantId.toString() === userId.toString();
        }
      );

      if (!isParticipant) {
        // Add user to participants
        tourGroup.participants.push(userId);
        await tourGroup.save();
        logger.info(`✅ Added user to "Tour Trip Planning" group: ${user.name} (${user.email})`);
      }
    }
  } catch (error: any) {
    logger.warn('Could not add user to Tour Trip Planning group:', error.message);
  }
};

interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserProfileData {
  name?: string;
  avatarUrl?: string;
  phone?: string;
  about?: string;
  readReceiptsEnabled?: boolean;
}

/**
 * Register a new user
 */
export const registerUser = async (userData: RegisterUserData) => {
  const { name, email, password } = userData;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User already exists');
  }

  // Create user
  const user = new User({
    name,
    email,
    passwordHash: password, // Will be hashed by pre-save hook
  });

  await user.save();

  // Automatically create a conversation with AI Assistant
  await createAssistantConversationForUser(user);

  // Automatically add user to Tour Trip Planning group
  await addUserToTourTripPlanningGroup(user);

  // Generate token
  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      about: user.about,
      readReceiptsEnabled: user.readReceiptsEnabled,
    },
    token,
  };
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string) => {
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Update last seen
  user.lastSeen = new Date();
  await user.save();

  // Track login activity
  try {
    const UserActivity = (await import('../models/UserActivity.js')).default;
    await UserActivity.create({
      userId: user._id,
      activityType: 'login',
      metadata: {},
      timestamp: new Date(),
    });
  } catch (activityError) {
    // Don't fail login if activity tracking fails
    console.warn('Failed to track login activity:', activityError);
  }

  // Generate token
  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isDemo: user.isDemo,
      phone: user.phone,
      about: user.about,
      readReceiptsEnabled: user.readReceiptsEnabled,
    },
    token,
  };
};

/**
 * Google OAuth login
 */
export const googleLoginUser = async (credential: string) => {
  const client = getGoogleClient();
  if (!client) {
    throw new ValidationError('Google OAuth is not configured on the server');
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: config.google.clientId!,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new AuthenticationError('Unable to verify Google credential');
  }

  const { sub: googleId, email, name, picture } = payload;
  if (!email) {
    throw new ValidationError('Google account does not have an email address');
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
    const UserActivity = (await import('../models/UserActivity.js')).default;
    await UserActivity.create({
      userId: user._id,
      activityType: 'login',
      metadata: { provider: 'google' },
      timestamp: new Date(),
    });
  } catch (activityError) {
    // Don't fail login if activity tracking fails
    console.warn('Failed to track Google login activity:', activityError);
  }

  if (isNewUser) {
    await createAssistantConversationForUser(user);
    // Automatically add new user to Tour Trip Planning group
    await addUserToTourTripPlanningGroup(user);
  }

  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isDemo: user.isDemo,
      phone: user.phone,
      about: user.about,
      readReceiptsEnabled: user.readReceiptsEnabled,
    },
    token,
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new NotFoundError('User not found');
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
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updateData: UpdateUserProfileData) => {
  const { name, avatarUrl, phone, about, readReceiptsEnabled } = updateData;

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update name if provided
  if (name !== undefined && name.trim() !== '') {
    user.name = name.trim();
  }

  // Update avatar if provided
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
    const UserActivity = (await import('../models/UserActivity.js')).default;
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
    // Don't fail profile update if activity tracking fails
    console.warn('Failed to track profile update activity:', activityError);
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
  };
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Remove user's messages
  await Message.deleteMany({ senderId: userId });

  // Remove user from conversations and admin lists
  await Conversation.updateMany(
    { participants: userId },
    {
      $pull: {
        participants: userId,
        admins: userId,
      },
    }
  );

  // Delete conversations that no longer have enough participants
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

  return { success: true };
};

