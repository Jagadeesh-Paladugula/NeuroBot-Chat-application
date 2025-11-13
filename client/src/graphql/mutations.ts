import { gql } from '@apollo/client';

export const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      user {
        id
        name
        email
        avatarUrl
        phone
        about
        readReceiptsEnabled
        isAdmin
      }
      message
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        avatarUrl
        isDemo
        phone
        about
        readReceiptsEnabled
        isAdmin
      }
      message
    }
  }
`;

export const GOOGLE_LOGIN = gql`
  mutation GoogleLogin($credential: String!) {
    googleLogin(credential: $credential) {
      token
      user {
        id
        name
        email
        avatarUrl
        isDemo
        phone
        about
        readReceiptsEnabled
        isAdmin
      }
      message
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $name: String
    $avatarUrl: String
    $phone: String
    $about: String
    $readReceiptsEnabled: Boolean
  ) {
    updateProfile(
      name: $name
      avatarUrl: $avatarUrl
      phone: $phone
      about: $about
      readReceiptsEnabled: $readReceiptsEnabled
    ) {
      id
      name
      email
      avatarUrl
      lastSeen
      isDemo
      isOnline
      phone
      about
      readReceiptsEnabled
      isAdmin
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount
  }
`;

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation(
    $participantId: ID
    $participantIds: [ID!]
    $name: String
    $type: String
  ) {
    createConversation(
      participantId: $participantId
      participantIds: $participantIds
      name: $name
      type: $type
    ) {
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
      }
      aiSummary {
        _id
        text
        messageCount
        generatedAt
      }
    }
  }
`;

export const DELETE_CONVERSATION = gql`
  mutation DeleteConversation($conversationId: ID!) {
    deleteConversation(conversationId: $conversationId)
  }
`;

export const CREATE_MESSAGE = gql`
  mutation CreateMessage(
    $conversationId: ID!
    $text: String!
    $attachments: [AttachmentInput]
  ) {
    createMessage(
      conversationId: $conversationId
      text: $text
      attachments: $attachments
    ) {
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
      }
      createdAt
      updatedAt
    }
  }
`;

