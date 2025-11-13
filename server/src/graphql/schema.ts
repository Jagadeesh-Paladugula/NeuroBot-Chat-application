import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    avatarUrl: String
    phone: String
    about: String
    readReceiptsEnabled: Boolean
    lastSeen: Date
    isDemo: Boolean
    isOnline: Boolean
    isAdmin: Boolean
  }

  type AuthResponse {
    token: String!
    user: User!
    message: String
  }

  type Attachment {
    url: String
    type: String
    name: String
  }

  type Message {
    _id: ID!
    conversationId: ID!
    senderId: User!
    text: String!
    attachments: [Attachment]
    status: String
    parentMessageId: Message
    mentions: [User]
    metadata: MessageMetadata
    createdAt: Date!
    updatedAt: Date!
  }

  type MessageMetadata {
    isAIMessage: Boolean
    aiPrompt: String
    isAISummary: Boolean
    summaryInfo: SummaryInfo
  }

  type SummaryInfo {
    requestedBy: ID
    requestedByName: String
    requestedAt: Date
    rangeStart: Date
    rangeEnd: Date
    messageCount: Int
  }

  type AISummary {
    _id: ID!
    text: String!
    messageCount: Int!
    generatedAt: Date!
    lastMessageCreatedAt: Date
    requestedBy: String
    requestedByName: String
    summaryMessageId: String
    rangeStart: Date
    rangeEnd: Date
    requestedAt: Date
  }

  type Conversation {
    id: ID!
    type: String!
    name: String
    participant: User
    participants: [User!]!
    createdBy: User
    admins: [User]
    lastMessage: Message
    lastMessageAt: Date
    unreadCount: Int
    createdAt: Date!
    updatedAt: Date!
    aiSummaries: [AISummary]
    aiSummary: AISummary
  }

  type ConversationSummary {
    summaryId: String
    summary: String!
    messageCount: Int!
    generatedAt: Date!
    requestedBy: String
    requestedByName: String
    lastMessageCreatedAt: Date
    cached: Boolean!
    summaryMessage: Message
    rangeStart: Date
    rangeEnd: Date
    requestedAt: Date
  }

  type MessagesResponse {
    messages: [Message!]!
    summaries: [AISummary!]!
    aiSummary: AISummary
    pagination: Pagination!
  }

  type Pagination {
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type Query {
    me: User
    conversations: [Conversation!]!
    conversation(id: ID!): Conversation
    messages(conversationId: ID!, page: Int, limit: Int): MessagesResponse!
    users: [User!]!
    conversationSummary(conversationId: ID!): ConversationSummary!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    googleLogin(credential: String!): AuthResponse!
    updateProfile(name: String, avatarUrl: String, phone: String, about: String, readReceiptsEnabled: Boolean): User!
    deleteAccount: Boolean!
    createConversation(participantId: ID, participantIds: [ID!], name: String, type: String): Conversation!
    deleteConversation(conversationId: ID!): Boolean!
    createMessage(conversationId: ID!, text: String, attachments: [AttachmentInput]): Message!
  }

  input AttachmentInput {
    url: String
    type: String
    name: String
  }
`;

