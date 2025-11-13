import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getEnvConfig } from '../utils/env';
import { logger } from '../utils/logger';
import { User, Message, Conversation } from '../utils/types';

const envConfig = getEnvConfig();

// Clean API URL and construct GraphQL endpoint
const getGraphQLUri = (): string => {
  const apiUrl = envConfig.apiUrl.replace('/api', '').replace(/\/$/, '');
  return `${apiUrl}/graphql`;
};

const httpLink = createHttpLink({
  uri: getGraphQLUri(),
  // Add timeout for requests (30 seconds)
  fetchOptions: {
    timeout: 30000,
  },
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error(
        `GraphQL Error: ${message}`,
        { locations, path, operation: operation.operationName },
        'GraphQL'
      );
    });
  }

  if (networkError) {
    logger.error(
      `Network Error: ${networkError.message}`,
      { networkError, operation: operation.operationName },
      'GraphQL'
    );

    // Handle specific network errors
    if ('statusCode' in networkError) {
      const statusCode = (networkError as { statusCode?: number }).statusCode;
      if (statusCode === 401) {
        // Unauthorized - token might be invalid
        logger.warn('Unauthorized request - token may be invalid', {}, 'GraphQL');
        // Clear token and redirect to login
        localStorage.removeItem('token');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
  }
});

// Request/response logging (only in development)
const logLink = new ApolloLink((operation, forward) => {
  // Only log in development
  if (import.meta.env.DEV) {
    logger.debug(
      `GraphQL Request: ${operation.operationName}`,
      {
        variables: operation.variables,
        query: operation.query.loc?.source.body?.substring(0, 100),
      },
      'GraphQL'
    );
  }

  return new Observable((observer) => {
    const subscription = forward(operation).subscribe({
      next: (response) => {
        if (import.meta.env.DEV) {
          logger.debug(
            `GraphQL Response: ${operation.operationName}`,
            {
              data: response.data,
              errors: response.errors,
            },
            'GraphQL'
          );
        }
        observer.next(response);
      },
      error: (error) => {
        logger.error(
          `GraphQL Network Error: ${operation.operationName}`,
          error,
          'GraphQL'
        );
        observer.error(error);
      },
      complete: () => {
        observer.complete();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  });
});

export const apolloClient = new ApolloClient({
  link: from([authLink, errorLink, logLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          conversations: {
            merge(existing = [], incoming) {
              // Always return incoming to ensure fresh data
              return Array.isArray(incoming) ? incoming : [];
            },
          },
          messages: {
            merge(
              existing: { messages: Message[]; pagination: { page?: number; limit?: number; hasMore?: boolean } } | undefined,
              incoming: { messages: Message[]; pagination: { page?: number; limit?: number; hasMore?: boolean } }
            ) {
              // For paginated messages, merge if it's pagination, otherwise replace
              if (incoming?.pagination?.page && incoming.pagination.page > 1 && existing) {
                // Merge paginated messages
                return {
                  ...incoming,
                  messages: [...(existing.messages || []), ...(incoming.messages || [])],
                };
              }
              // Replace with new data
              return incoming;
            },
          },
          users: {
            merge(existing = [], incoming) {
              // Always return incoming to ensure fresh data
              return Array.isArray(incoming) ? incoming : [];
            },
          },
        },
      },
      Conversation: {
        fields: {
          messages: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          aiSummaries: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
      Message: {
        fields: {
          parentMessageId: {
            merge(existing, incoming) {
              return incoming || existing;
            },
          },
        },
      },
    },
    // Cache size limit (100MB)
    resultCaching: true,
    // Enable cache compression in production
    dataIdFromObject: (object: { __typename?: string; id?: string; _id?: string }) => {
      if (!object.__typename) return null;
      if (object.id) {
        return `${object.__typename}:${object.id}`;
      }
      if (object._id) {
        return `${object.__typename}:${object._id}`;
      }
      return null;
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
      // Refetch interval for real-time updates (disabled, using sockets)
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network', // Changed from cache-first to cache-and-network for fresh data
      // Return cached data while refetching
      returnPartialData: false, // Changed to false to avoid stale data
    },
    mutate: {
      errorPolicy: 'all',
      // Refetch queries after mutation
      refetchQueries: 'active',
    },
  },
  // Enable query deduplication
  queryDeduplication: true,
  // Connect to DevTools in development
  connectToDevTools: import.meta.env.DEV,
});

