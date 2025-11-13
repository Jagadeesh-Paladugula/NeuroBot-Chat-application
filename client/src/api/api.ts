import { apolloClient } from '../graphql/client';
import { UPDATE_PROFILE, DELETE_ACCOUNT, CREATE_CONVERSATION, DELETE_CONVERSATION } from '../graphql/mutations';
import { GET_CONVERSATIONS as GET_CONVERSATIONS_QUERY, GET_MESSAGES as GET_MESSAGES_QUERY, GET_USERS as GET_USERS_QUERY, GET_CONVERSATION_SUMMARY as GET_CONVERSATION_SUMMARY_QUERY } from '../graphql/queries';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';
import { apiRateLimiter } from '../utils/rateLimiter';
import { User, Conversation, MessagesResponse, ApiResponse, GraphQLError, NetworkError } from '../utils/types';
import { ApolloError } from '@apollo/client';

interface UpdateProfilePayload {
  name?: string;
  email?: string;
  avatarUrl?: string;
  phone?: string;
  about?: string;
  readReceiptsEnabled?: boolean;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

// Profile & preferences update function
export const updateProfile = async (payload: UpdateProfilePayload): Promise<ApiResponse> => {
  try {
    // Check rate limit
    if (!apiRateLimiter.isAllowed('updateProfile')) {
      const timeUntilReset = apiRateLimiter.getTimeUntilReset('updateProfile');
      return {
        success: false,
        error: `Rate limit exceeded. Please try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`,
      };
    }

    logger.debug('Updating profile', {}, 'API');
    
    // Retry with exponential backoff
    const result = await retry(
      async () => {
        const result = await apolloClient.mutate<{ updateProfile: User }>({
          mutation: UPDATE_PROFILE,
          variables: {
            name: payload.name,
            avatarUrl: payload.avatarUrl,
            phone: payload.phone,
            about: payload.about,
            readReceiptsEnabled: payload.readReceiptsEnabled,
          },
          errorPolicy: 'all',
        });
        
        if (result.errors && result.errors.length > 0) {
          const error = result.errors[0] as GraphQLError;
          throw new Error(error?.message || 'Failed to update profile');
        }
        
        if (!result.data?.updateProfile) {
          throw new Error('Failed to update profile: No data received');
        }
        
        return result.data.updateProfile;
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          logger.warn(`Retrying profile update (attempt ${attempt})`, { error: error.message }, 'API');
        },
      }
    );
    
    logger.info('Profile updated', {}, 'API');
    return { success: true, data: result };
  } catch (error) {
    logger.error('Error updating profile', error instanceof Error ? error : new Error(String(error)), 'API');
    const errorMessage = error instanceof Error ? error.message : (error as NetworkError)?.message || 'Failed to update profile';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const deleteAccount = async (): Promise<ApiResponse> => {
  try {
    logger.debug('Deleting account', {}, 'API');
    const result = await apolloClient.mutate<{ deleteAccount: boolean }>({
      mutation: DELETE_ACCOUNT,
      errorPolicy: 'all',
    });
    
    if (result.errors && result.errors.length > 0) {
      logger.error('Error deleting account', result.errors, 'API');
      const error = result.errors[0] as GraphQLError;
      return {
        success: false,
        error: error?.message || 'Failed to delete account',
      };
    }
    
    if (result.data === undefined || result.data === null) {
      logger.error('No data in delete account response', {}, 'API');
      return {
        success: false,
        error: 'Failed to delete account: No data received',
      };
    }
    
    logger.info('Account deleted', {}, 'API');
    return { success: true };
  } catch (error) {
    logger.error('Error deleting account', error instanceof Error ? error : new Error(String(error)), 'API');
    const errorMessage = error instanceof Error ? error.message : (error as NetworkError)?.message || 'Failed to delete account';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// GraphQL API wrapper for backward compatibility
interface ApiConfig {
  params?: {
    page?: number;
    limit?: number;
  };
}

const api = {
  get: async <T = unknown>(url: string, config?: ApiConfig): Promise<{ data: T }> => {
    try {
      if (url === '/conversations') {
        // Check rate limit
        if (!apiRateLimiter.isAllowed('getConversations')) {
          const timeUntilReset = apiRateLimiter.getTimeUntilReset('getConversations');
          throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`);
        }

        logger.debug('Fetching conversations', {}, 'API');
        
        // Retry with exponential backoff
        const result = await retry(
          async () => {
            const result = await apolloClient.query<{ conversations: Conversation[] }>({
              query: GET_CONVERSATIONS_QUERY,
              fetchPolicy: 'network-only',
              errorPolicy: 'all',
            });
            
            if (result.errors && result.errors.length > 0) {
              const error = result.errors[0] as GraphQLError;
              throw new Error(error?.message || 'Failed to fetch conversations');
            }
            
            if (!result.data) {
              throw new Error('Failed to fetch conversations: No data received');
            }
            
            return { conversations: result.data.conversations || [] };
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
            onRetry: (attempt, error) => {
              logger.warn(`Retrying conversations fetch (attempt ${attempt})`, { error: error.message }, 'API');
            },
          }
        );
        
        logger.debug('Conversations fetched', { count: result.conversations?.length || 0 }, 'API');
        return { data: result as T };
      } else if (url.includes('/messages')) {
        // Handle /conversations/:id/messages
        const parts = url.split('/');
        const conversationId = parts[2];
        const page = config?.params?.page || 1;
        const limit = config?.params?.limit || 50;
        
        logger.debug('Fetching messages', { conversationId, page, limit }, 'API');
        const result = await apolloClient.query<{ messages: MessagesResponse }>({
          query: GET_MESSAGES_QUERY,
          variables: { conversationId, page, limit },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });
        
        if (result.errors && result.errors.length > 0) {
          logger.error('Error fetching messages', result.errors, 'API');
          const error = result.errors[0] as GraphQLError;
          throw new Error(error?.message || 'Failed to fetch messages');
        }
        
        if (!result.data?.messages) {
          logger.error('No messages in response', {}, 'API');
          throw new Error('Failed to fetch messages: No data received');
        }
        
        return { data: result.data.messages as T };
      } else if (url === '/conversations/users') {
        logger.debug('Fetching users', {}, 'API');
        try {
          const result = await apolloClient.query<{ users: User[] }>({
            query: GET_USERS_QUERY,
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          });
          
          if (result.errors && result.errors.length > 0) {
            logger.error('Error fetching users', result.errors, 'API');
            const error = result.errors[0] as GraphQLError;
            throw new Error(error?.message || 'Failed to fetch users');
          }
          
          if (!result.data) {
            logger.warn('No data in GraphQL response for users', {}, 'API');
            return { data: { users: [] } as T };
          }
          
          const users = Array.isArray(result.data.users) ? result.data.users : [];
          logger.debug('Users fetched', { count: users.length }, 'API');
          return { data: { users } as T };
        } catch (error) {
          logger.error('Error in users query', error instanceof Error ? error : new Error(String(error)), 'API');
          throw error;
        }
      } else if (url.includes('/summary')) {
        // Handle /conversations/:id/summary
        const parts = url.split('/');
        const conversationId = parts[2];
        
        logger.debug('Fetching conversation summary', { conversationId }, 'API');
        const result = await apolloClient.query<{ conversationSummary: { summary: string } }>({
          query: GET_CONVERSATION_SUMMARY_QUERY,
          variables: { conversationId },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });
        
        if (result.errors && result.errors.length > 0) {
          logger.error('Error fetching summary', result.errors, 'API');
          const error = result.errors[0] as GraphQLError;
          throw new Error(error?.message || 'Failed to fetch summary');
        }
        
        if (!result.data?.conversationSummary) {
          logger.error('No summary in response', {}, 'API');
          throw new Error('Failed to fetch summary: No data received');
        }
        
        return { data: result.data.conversationSummary as T };
      }
      throw new Error(`Unsupported GET endpoint: ${url}`);
    } catch (error) {
      logger.error('API GET error', error instanceof Error ? error : new Error(String(error)), 'API');
      throw error;
    }
  },
  post: async <T = unknown>(url: string, data?: { participantId?: string; participantIds?: string[]; name?: string; type?: string }): Promise<{ data: T }> => {
    try {
      if (url === '/conversations') {
        logger.debug('Creating conversation', data, 'API');
        const result = await apolloClient.mutate<{ createConversation: Conversation }>({
          mutation: CREATE_CONVERSATION,
          variables: data,
          refetchQueries: [{ query: GET_CONVERSATIONS_QUERY }],
          errorPolicy: 'all',
        });
        
        if (result.errors && result.errors.length > 0) {
          logger.error('Error creating conversation', result.errors, 'API');
          const error = result.errors[0] as GraphQLError;
          throw new Error(error?.message || 'Failed to create conversation');
        }
        
        if (!result.data?.createConversation) {
          logger.error('No conversation data in response', {}, 'API');
          throw new Error('Failed to create conversation: No data received');
        }
        
        logger.info('Conversation created', { id: result.data.createConversation.id }, 'API');
        return { data: { conversation: result.data.createConversation } as T };
      }
      throw new Error(`Unsupported POST endpoint: ${url}`);
    } catch (error) {
      logger.error('API POST error', error instanceof Error ? error : new Error(String(error)), 'API');
      throw error;
    }
  },
  delete: async <T = unknown>(url: string): Promise<{ data: T }> => {
    try {
      if (url.startsWith('/conversations/')) {
        const conversationId = url.split('/')[2];
        logger.debug('Deleting conversation', { conversationId }, 'API');

        const result = await apolloClient.mutate<{ deleteConversation: boolean }>({
          mutation: DELETE_CONVERSATION,
          variables: { conversationId },
          refetchQueries: [{ query: GET_CONVERSATIONS_QUERY }],
          errorPolicy: 'all',
        });

        if (result.errors && result.errors.length > 0) {
          logger.error('Error deleting conversation', result.errors, 'API');
          const error = result.errors[0] as GraphQLError;
          throw new Error(error?.message || 'Failed to delete conversation');
        }

        if (result.data === undefined || result.data === null) {
          logger.error('No data in delete conversation response', {}, 'API');
          throw new Error('Failed to delete conversation: No data received');
        }

        logger.info('Conversation deleted', { conversationId, success: result.data.deleteConversation || false }, 'API');
        return { data: { success: result.data.deleteConversation || false } as T };
      }
      throw new Error(`Unsupported DELETE endpoint: ${url}`);
    } catch (error) {
      logger.error('API DELETE error', error instanceof Error ? error : new Error(String(error)), 'API');
      throw error;
    }
  },
};

export default api;

