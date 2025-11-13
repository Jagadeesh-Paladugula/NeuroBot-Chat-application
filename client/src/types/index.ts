// Global type definitions

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string | Date;
  isDemo?: boolean;
  isAdmin?: boolean;
  readReceiptsEnabled?: boolean;
  phone?: string;
  about?: string;
}

export interface Attachment {
  url: string;
  type: string;
  name?: string;
}

export interface Message {
  _id?: string;
  id?: string;
  text: string;
  senderId?: User;
  conversationId?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  status?: 'sent' | 'delivered' | 'seen';
  attachments?: Attachment[];
  parentMessageId?: {
    senderId?: User;
    text: string;
  };
  mentions?: Array<{ name: string; _id?: string; id?: string }>;
  metadata?: {
    isAISummary?: boolean;
    isAIMessage?: boolean;
    summaryInfo?: {
      requestedBy?: string;
      requestedByName?: string;
      messageCount?: number;
      requestedAt?: string | Date;
      rangeStart?: string | Date;
      rangeEnd?: string | Date;
    };
  };
}

export interface Conversation {
  id?: string;
  _id?: string;
  type?: 'one-to-one' | 'group';
  name?: string;
  participant?: User;
  participants?: User[];
  lastMessage?: Message;
  lastMessageAt?: string | Date;
  unreadCount?: number;
  admins?: Array<User | string>;
  createdBy?: User | string;
  aiSummaries?: unknown[];
  aiSummary?: unknown;
}

// Extend Window interface for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement | null, config: unknown) => void;
        };
      };
    };
  }
}

