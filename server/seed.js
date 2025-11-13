import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';
import Conversation from './src/models/Conversation.js';
import Message from './src/models/Message.js';
import UserActivity from './src/models/UserActivity.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app';

const logDivider = () => console.log('--------------------------------------------------');

const createMessagesForConversation = async (conversation, messages = []) => {
  let lastMessage = null;

  for (const messageData of messages) {
    const message = new Message({
      conversationId: conversation._id,
      senderId: messageData.senderId,
      text: messageData.text,
      metadata: messageData.metadata || {},
    });

    await message.save();
    lastMessage = message;
  }

  if (lastMessage) {
    conversation.lastMessage = lastMessage._id;
    conversation.lastMessageAt = lastMessage.createdAt;
    await conversation.save();
  }
};

export const seedDatabase = async (forceReset = false) => {
  // Check if database already has data
  const existingUsers = await User.countDocuments();
  const existingActivities = await UserActivity.countDocuments();
  const existingConversations = await Conversation.countDocuments();
  const existingMessages = await Message.countDocuments();
  
  // Only seed if database is empty or if forceReset is true
  if (!forceReset && existingUsers > 0) {
    console.log('📊 Database already has data. Skipping seed. (Use forceReset=true to reset)');
    console.log(`   Found ${existingUsers} users, ${existingConversations} conversations, ${existingMessages} messages, and ${existingActivities} activity records`);
    return;
  }

  if (forceReset) {
    console.log('🌱 Force resetting database with fresh demo data...');
    console.log(`   Clearing ${existingUsers} users, ${existingConversations} conversations, ${existingMessages} messages, and ${existingActivities} activity records`);
  } else {
    console.log('🌱 Seeding empty database with fresh demo data...');
  }

  // Clear all collections in parallel
  const [deletedUsers, deletedConversations, deletedMessages, deletedActivities] = await Promise.all([
    User.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    UserActivity.deleteMany({}),
  ]);

  console.log('🧹 Existing records cleared:');
  console.log(`   - ${deletedUsers.deletedCount} users`);
  console.log(`   - ${deletedConversations.deletedCount} conversations`);
  console.log(`   - ${deletedMessages.deletedCount} messages`);
  console.log(`   - ${deletedActivities.deletedCount} activity records`);

  const usersData = [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'admin123',
      isAdmin: true,
      isDemo: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'AI Assistant',
      email: 'assistant@demo.com',
      passwordHash: 'demo123',
      isDemo: true,
      avatarUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Demo User 1',
      email: 'demo1@example.com',
      passwordHash: 'demo123',
      isDemo: true,
      avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Demo User 2',
      email: 'demo2@example.com',
      passwordHash: 'demo123',
      isDemo: true,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Ava Thompson',
      email: 'ava.thompson@example.com',
      passwordHash: 'demo123',
      avatarUrl: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Noah Ramirez',
      email: 'noah.ramirez@example.com',
      passwordHash: 'demo123',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Isla Bennett',
      email: 'isla.bennett@example.com',
      passwordHash: 'demo123',
      avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=256&q=80',
    },
  ];

  const createdUsers = [];
  for (const userData of usersData) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.name} (${user.email})`);
  }

  const assistant = createdUsers.find((user) => user.email === 'assistant@demo.com');
  const humanUsers = createdUsers.filter((user) => user.email !== 'assistant@demo.com');
  const [demoOne, demoTwo, ...additionalUsers] = humanUsers;

  const allParticipantIds = createdUsers.map((user) => user._id);
  const tripPlanner = new Conversation({
    type: 'group',
    name: 'Tour Trip Planning',
    participants: allParticipantIds,
    createdBy: demoOne._id,
    admins: [demoOne._id],
  });
  await tripPlanner.save();

  const groupMessages = [
    {
      senderId: demoOne._id,
      text: 'Welcome everyone! Let’s lock our tour plan. Thinking Lisbon for late July—thoughts?',
    },
    {
      senderId: demoTwo._id,
      text: 'Lisbon sounds amazing! I can research the best neighborhoods to stay in.',
    },
    {
      senderId: additionalUsers[0]._id,
      text: 'I’ll compare flight options from NYC and share the top picks by tonight.',
    },
    {
      senderId: additionalUsers[1]._id,
      text: 'Adding activities to a shared doc. Sunset cruise and food tour are musts!',
    },
    {
      senderId: additionalUsers[2]._id,
      text: 'I’ll put together our budget tracker and make sure we stay on target.',
    },
    {
          senderId: assistant._id,
      text: 'I’m on standby to summarize takeaways or draft itineraries whenever you need me.',
          metadata: { isAIMessage: true },
        },
    {
      senderId: assistant._id,
      text:
        "Sounds like great progress on the Lisbon trip! Demo User 2 will scout the best neighborhoods, while Ava will find the best flight deals from NYC. Noah's on activities, suggesting a sunset cruise and food tour, and Isla's keeping us on budget with a tracker!",
      metadata: {
        isAIMessage: true,
        isAISummary: true,
        summaryInfo: {
          requestedBy: demoOne._id,
          requestedByName: demoOne.name,
          requestedAt: new Date(),
          rangeStart: new Date(),
          rangeEnd: new Date(),
          messageCount: 5,
        },
      },
    },
      ];

  await createMessagesForConversation(tripPlanner, groupMessages);
  console.log('👥 Seeded "Tour Trip Planning" group chat with starter messages for every user');

  // Create additional conversations and messages for more activity data
  const oneOnOneConversations = [];
  for (let i = 0; i < Math.min(3, humanUsers.length - 1); i++) {
    const conv = new Conversation({
      type: 'one-to-one',
      participants: [humanUsers[i]._id, humanUsers[i + 1]._id],
      createdBy: humanUsers[i]._id,
    });
    await conv.save();
    oneOnOneConversations.push(conv);

    const oneOnOneMessages = [
      {
        senderId: humanUsers[i]._id,
        text: `Hey ${humanUsers[i + 1].name}! How are you doing?`,
      },
      {
        senderId: humanUsers[i + 1]._id,
        text: `Hi ${humanUsers[i].name}! I'm doing great, thanks for asking!`,
      },
      {
        senderId: humanUsers[i]._id,
        text: 'That\'s awesome! Want to catch up this weekend?',
      },
    ];

    await createMessagesForConversation(conv, oneOnOneMessages);
  }
  console.log(`💬 Created ${oneOnOneConversations.length} one-on-one conversations`);

  // Generate mock activity data
  console.log('📊 Generating mock activity data...');
  const activities = [];
  const now = new Date();
  
  // Generate activities for the last 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Login activities for each user
    for (const user of humanUsers) {
      const loginTime = new Date(date);
      loginTime.setHours(9 + Math.floor(Math.random() * 3)); // Between 9 AM and 12 PM
      activities.push({
        userId: user._id,
        activityType: 'login',
        metadata: {},
        timestamp: loginTime,
      });
    }

    // Message activities
    const allMessages = await Message.find({}).sort({ createdAt: -1 }).limit(50);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    for (const message of allMessages) {
      const messageTime = new Date(message.createdAt);
      if (messageTime >= dayStart && messageTime <= dayEnd) {
        // Message sent activity
        activities.push({
          userId: message.senderId,
          activityType: 'message_sent',
          metadata: {
            messageId: message._id,
            conversationId: message.conversationId,
          },
          timestamp: message.createdAt,
        });

        // Message received activities for other participants
        const conv = await Conversation.findById(message.conversationId);
        if (conv) {
          const otherParticipants = conv.participants.filter(
            (p) => p.toString() !== message.senderId.toString()
          );
          for (const participantId of otherParticipants) {
            activities.push({
              userId: participantId,
              activityType: 'message_received',
              metadata: {
                messageId: message._id,
                conversationId: message.conversationId,
                senderId: message.senderId,
              },
              timestamp: new Date(message.createdAt.getTime() + Math.random() * 60000), // Within 1 minute
            });
          }
        }
      }
    }

    // Conversation created activities
    const allConversations = await Conversation.find({});
    for (const conv of allConversations) {
      const convTime = new Date(conv.createdAt);
      if (convTime >= dayStart && convTime <= dayEnd && conv.createdBy) {
        activities.push({
          userId: conv.createdBy,
          activityType: 'conversation_created',
          metadata: {
            conversationId: conv._id,
            type: conv.type,
            name: conv.name,
          },
          timestamp: conv.createdAt,
        });
      }
    }

    // Logout activities (evening)
    for (const user of humanUsers) {
      if (Math.random() > 0.3) { // 70% chance of logout
        const logoutTime = new Date(date);
        logoutTime.setHours(18 + Math.floor(Math.random() * 4)); // Between 6 PM and 10 PM
        activities.push({
          userId: user._id,
          activityType: 'logout',
          metadata: {},
          timestamp: logoutTime,
        });
      }
    }

    // Profile updates (occasional)
    for (const user of humanUsers) {
      if (Math.random() > 0.8) { // 20% chance
        const updateTime = new Date(date);
        updateTime.setHours(10 + Math.floor(Math.random() * 8));
        activities.push({
          userId: user._id,
          activityType: 'profile_updated',
          metadata: {
            field: ['name', 'about', 'avatarUrl'][Math.floor(Math.random() * 3)],
          },
          timestamp: updateTime,
        });
      }
    }
  }

  // Insert activities in batches
  if (activities.length > 0) {
    await UserActivity.insertMany(activities);
    console.log(`✅ Generated ${activities.length} activity records`);
  }

  logDivider();
  console.log('✅ Database seeded successfully with fresh demo data');
  logDivider();
  console.log('📝 Demo credentials (password: demo123 unless noted):');
  createdUsers.forEach((user) => {
    const role = user.isAdmin ? ' [ADMIN]' : '';
    console.log(`   ${user.email}${role}`);
  });
  console.log('\n🔑 Admin credentials:');
  const adminUser = createdUsers.find((u) => u.isAdmin);
  if (adminUser) {
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123`);
  }
  logDivider();
};

const modulePath = fileURLToPath(import.meta.url);
const isExecutedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === modulePath
  : false;

if (isExecutedDirectly) {
  (async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB');
      await seedDatabase();
    await mongoose.disconnect();
      console.log('👋 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
  })();
}