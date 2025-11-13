/**
 * Type definitions and utilities for better type safety
 */

// Remove 'any' types and replace with proper types

/**
 * User type
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  about?: string;
  readReceiptsEnabled?: boolean;
  lastSeen?: string;
  isOnline?: boolean;
  isDemo?: boolean;
  isAdmin?: boolean;
}

/**
 * Message type
 */
export interface Message {
  _id?: string;
  id?: string;
  conversationId?: string;
  senderId?: User;
  text: string;
  attachments?: Attachment[];
  status?: 'sent' | 'delivered' | 'read';
  parentMessageId?: Message | string;
  mentions?: User[];
  metadata?: MessageMetadata;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Attachment type
 */
export interface Attachment {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

/**
 * Message metadata type
 */
export interface MessageMetadata {
  isAIMessage?: boolean;
  aiPrompt?: string;
  isAISummary?: boolean;
  summaryInfo?: SummaryInfo;
}

/**
 * Summary info type
 */
export interface SummaryInfo {
  requestedBy?: string;
  requestedByName?: string;
  requestedAt?: string;
  rangeStart?: string;
  rangeEnd?: string;
  messageCount?: number;
}

/**
 * Conversation type
 */
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participant?: User;
  participants?: User[];
  createdBy?: User;
  admins?: User[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
  aiSummaries?: AISummary[];
  aiSummary?: AISummary;
}

/**
 * AI Summary type
 */
export interface AISummary {
  _id?: string;
  text: string;
  messageCount?: number;
  generatedAt?: string;
  lastMessageCreatedAt?: string;
  requestedBy?: string;
  requestedByName?: string;
  summaryMessageId?: string;
  rangeStart?: string;
  rangeEnd?: string;
  requestedAt?: string;
}

/**
 * Pagination type
 */
export interface Pagination {
  page: number;
  limit: number;
  hasMore: boolean;
  total?: number;
}

/**
 * Messages response type
 */
export interface MessagesResponse {
  messages: Message[];
  summaries?: AISummary[];
  aiSummary?: AISummary;
  pagination: Pagination;
}

/**
 * API Response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Auth Response type
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * GraphQL Error type
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

/**
 * Network Error type
 */
export interface NetworkError {
  message: string;
  statusCode?: number;
  result?: {
    errors?: GraphQLError[];
  };
}

/**
 * Retry options type
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Rate limiter options type
 */
export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  key?: string;
}

/**
 * Performance metric type
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

/**
 * Error event type
 */
export interface ErrorEvent {
  error: Error;
  context?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info';
}

/**
 * Type guard for User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

/**
 * Type guard for Message
 */
export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'text' in obj &&
    typeof (obj as Message).text === 'string'
  );
}

/**
 * Type guard for Conversation
 */
export function isConversation(obj: unknown): obj is Conversation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    ((obj as Conversation).type === 'direct' || (obj as Conversation).type === 'group')
  );
}

/**
 * Normalize user ID (handles both _id and id)
 */
export function normalizeUserId(user: User | { _id?: string; id?: string } | string | undefined): string | undefined {
  if (!user) return undefined;
  if (typeof user === 'string') return user;
  return user.id || user._id;
}

/**
 * Normalize message ID (handles both _id and id)
 */
export function normalizeMessageId(message: Message | { _id?: string; id?: string } | string | undefined): string | undefined {
  if (!message) return undefined;
  if (typeof message === 'string') return message;
  return message._id || message.id;
}

/**
 * Normalize conversation ID (handles both _id and id)
 */
export function normalizeConversationId(conversation: Conversation | { _id?: string; id?: string } | string | undefined): string | undefined {
  if (!conversation) return undefined;
  if (typeof conversation === 'string') return conversation;
  return conversation.id || (conversation as { _id?: string })._id;
}

