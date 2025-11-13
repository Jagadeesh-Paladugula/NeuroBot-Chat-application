import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      avatarUrl
      phone
      about
      readReceiptsEnabled
      lastSeen
      isDemo
      isOnline
      isAdmin
    }
  }
`;

export const GET_CONVERSATIONS = gql`
  query GetConversations {
    conversations {
      id
      type
      name
      participant {
        id
        name
        email
        avatarUrl
        isOnline
        lastSeen
      }
      participants {
        id
        name
        email
        avatarUrl
        isOnline
        lastSeen
      }
      createdBy {
        id
        name
        email
        avatarUrl
      }
      admins {
        id
        name
        email
        avatarUrl
      }
      lastMessage {
        _id
        text
        senderId {
          id
          name
        }
        createdAt
      }
      lastMessageAt
      unreadCount
      createdAt
      updatedAt
      aiSummaries {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
      aiSummary {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
    }
  }
`;

export const GET_CONVERSATION = gql`
  query GetConversation($id: ID!) {
    conversation(id: $id) {
      id
      type
      name
      participant {
        id
        name
        email
        avatarUrl
        isOnline
        lastSeen
      }
      participants {
        id
        name
        email
        avatarUrl
        isOnline
        lastSeen
      }
      createdBy {
        id
        name
        email
        avatarUrl
      }
      admins {
        id
        name
        email
        avatarUrl
      }
      lastMessage {
        _id
        text
        senderId {
          id
          name
        }
        createdAt
      }
      lastMessageAt
      unreadCount
      createdAt
      updatedAt
      aiSummaries {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
      aiSummary {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!, $page: Int, $limit: Int) {
    messages(conversationId: $conversationId, page: $page, limit: $limit) {
      messages {
        _id
        conversationId
        senderId {
          id
          name
          email
          avatarUrl
        }
        text
        attachments {
          url
          type
          name
        }
        status
        parentMessageId {
          _id
          text
          senderId {
            id
            name
          }
        }
        mentions {
          id
          name
          email
        }
        metadata {
          isAIMessage
          aiPrompt
          isAISummary
          summaryInfo {
            requestedBy
            requestedByName
            requestedAt
            rangeStart
            rangeEnd
            messageCount
          }
        }
        createdAt
        updatedAt
      }
      summaries {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
      aiSummary {
        _id
        text
        messageCount
        generatedAt
        lastMessageCreatedAt
        requestedBy
        requestedByName
        summaryMessageId
        rangeStart
        rangeEnd
        requestedAt
      }
      pagination {
        page
        limit
        hasMore
      }
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      avatarUrl
      isOnline
      lastSeen
      isDemo
    }
  }
`;

export const GET_CONVERSATION_SUMMARY = gql`
  query GetConversationSummary($conversationId: ID!) {
    conversationSummary(conversationId: $conversationId) {
      summaryId
      summary
      messageCount
      generatedAt
      requestedBy
      requestedByName
      lastMessageCreatedAt
      cached
      summaryMessage {
        _id
        text
        senderId {
          id
          name
          email
          avatarUrl
        }
        createdAt
      }
      rangeStart
      rangeEnd
      requestedAt
    }
  }
`;

