/**
 * Application constants
 */

// User roles and types
export const USER_TYPES = {
  DEMO: 'demo',
  REGULAR: 'regular',
} as const;

// Conversation types
export const CONVERSATION_TYPES = {
  ONE_TO_ONE: 'one-to-one',
  GROUP: 'group',
} as const;

// Message statuses
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  SEEN: 'seen',
  FAILED: 'failed',
} as const;

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VIDEO: 'video',
  AUDIO: 'audio',
} as const;

// Attachment types
export const ATTACHMENT_TYPES = {
  IMAGE: 'image',
  FILE: 'file',
  VIDEO: 'video',
} as const;

// Default values
export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
  },
  MESSAGE: {
    MAX_LENGTH: 5000,
    MIN_LENGTH: 1,
  },
  USER: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    ABOUT_MAX_LENGTH: 500,
    PHONE_MAX_LENGTH: 20,
  },
  CONVERSATION: {
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  AUTHENTICATION_FAILED: 'Authentication failed',
  AUTHORIZATION_FAILED: 'Access denied',
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  USER_ALREADY_EXISTS: 'User already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_REQUIRED: 'No token provided',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  SERVER_ERROR: 'Internal server error',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  LOGIN_SUCCESS: 'Login successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  ACCOUNT_DELETED: 'Account deleted successfully',
  CONVERSATION_CREATED: 'Conversation created successfully',
  MESSAGE_SENT: 'Message sent successfully',
  OPERATION_SUCCESS: 'Operation completed successfully',
} as const;

// Socket events
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  ADD_USER: 'addUser',
  USER_ADDED: 'userAdded',
  SEND_MESSAGE: 'sendMessage',
  GET_MESSAGE: 'getMessage',
  TYPING: 'typing',
  MESSAGE_DELIVERED: 'messageDelivered',
  MESSAGE_SEEN: 'messageSeen',
  MESSAGE_STATUS_UPDATE: 'messageStatusUpdate',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  SUMMARY_GENERATED: 'summaryGenerated',
  ERROR: 'error',
} as const;

// AI Assistant
export const AI_ASSISTANT = {
  EMAIL: 'assistant@demo.com',
  DEFAULT_NAME: 'AI Assistant',
} as const;

// Group names
export const GROUP_NAMES = {
  TOUR_TRIP_PLANNING: 'Tour Trip Planning',
} as const;

