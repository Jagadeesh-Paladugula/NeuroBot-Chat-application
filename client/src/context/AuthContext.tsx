import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { apolloClient } from '../graphql/client';
import { GET_ME } from '../graphql/queries';
import { LOGIN, REGISTER, GOOGLE_LOGIN, UPDATE_PROFILE, DELETE_ACCOUNT } from '../graphql/mutations';
import { logger } from '../utils/logger';
import { validateEmail, sanitizeName } from '../utils/sanitize';
import { retry } from '../utils/retry';
import { authRateLimiter } from '../utils/rateLimiter';
import { User, AuthResponse, GraphQLError, NetworkError } from '../utils/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'AUTH_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGOUT' }
  | { type: 'FETCH_USER_START' }
  | { type: 'FETCH_USER_SUCCESS'; payload: User }
  | { type: 'FETCH_USER_FAILURE' };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'AUTH_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        loading: false,
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        user: null,
        loading: false,
      };
    case 'FETCH_USER_START':
      return { ...state, loading: true };
    case 'FETCH_USER_SUCCESS':
      return { ...state, user: action.payload, loading: false };
    case 'FETCH_USER_FAILURE':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        user: null,
        loading: false,
      };
    default:
      return state;
  }
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const [loginMutation] = useMutation(LOGIN);
  const [registerMutation] = useMutation(REGISTER);
  const [googleLoginMutation] = useMutation(GOOGLE_LOGIN);
  const [updateProfileMutation] = useMutation(UPDATE_PROFILE);
  const [deleteAccountMutation] = useMutation(DELETE_ACCOUNT);

  const { data: meData, loading: meLoading, error: meError, refetch: refetchMe } = useQuery(GET_ME, {
    skip: !state.token,
    errorPolicy: 'all',
    fetchPolicy: 'network-only', // Always fetch from network, don't use cache
  });

  useEffect(() => {
    // Update user from meData when available
    // Always update to ensure we have the latest user data including isAdmin
    if (state.token && meData?.me) {
      // Update if we don't have a user, or if the user ID matches (to sync latest server data)
      // This ensures properties like isAdmin are always up-to-date
      if (!state.user || state.user.id === meData.me.id) {
        // Only update if the data actually changed to prevent infinite loops
        const userChanged = !state.user || 
          state.user.name !== meData.me.name ||
          state.user.email !== meData.me.email ||
          state.user.isAdmin !== meData.me.isAdmin ||
          state.user.isOnline !== meData.me.isOnline;
        
        if (userChanged) {
          logger.info('Updating user from GET_ME query', { email: meData.me.email, isAdmin: meData.me.isAdmin }, 'Auth');
          dispatch({ type: 'FETCH_USER_SUCCESS', payload: meData.me });
        }
      } else if (state.user.id !== meData.me.id) {
        // User ID changed (token changed), update immediately
        logger.info('User ID changed, updating user from GET_ME query', { email: meData.me.email }, 'Auth');
        dispatch({ type: 'FETCH_USER_SUCCESS', payload: meData.me });
      }
    } else if (state.token && meError) {
      logger.error('Failed to fetch user', meError, 'Auth');
      dispatch({ type: 'FETCH_USER_FAILURE' });
    } else if (!state.token) {
      dispatch({ type: 'SET_LOADING', payload: false });
    } else if (meLoading) {
      dispatch({ type: 'FETCH_USER_START' });
    }
  }, [state.token, meData, meLoading, meError, state.user]);

  const fetchUser = useCallback(async (): Promise<void> => {
    if (!state.token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    await refetchMe();
  }, [state.token, refetchMe]);

  const handleAuthSuccess = async (authResponse: AuthResponse): Promise<void> => {
    logger.info('Auth success', { email: authResponse.user.email }, 'Auth');
    
    // Clear Apollo cache to prevent stale data
    await apolloClient.clearStore();
    
    // Set the token first
    localStorage.setItem('token', authResponse.token);
    
    // Dispatch the auth success with the user from login response
    // This sets the user immediately from the login response
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: { token: authResponse.token, user: authResponse.user },
    });
    
    // Small delay to ensure state is updated before refetch
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Refetch the user data to ensure we have the latest
    // This will update the user if there are any differences
    try {
      const result = await refetchMe();
      logger.debug('Refetched user data', { email: result.data?.me?.email }, 'Auth');
      // The useEffect will handle updating the user if needed
    } catch (error) {
      logger.error('Error refetching user after login', error, 'Auth');
      // If refetch fails, we still have the user from login response
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check rate limit
      if (!authRateLimiter.isAllowed('login')) {
        const timeUntilReset = authRateLimiter.getTimeUntilReset('login');
        return {
          success: false,
          error: `Too many login attempts. Please try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`,
        };
      }

      // Validate email format
      if (!validateEmail(email)) {
        return {
          success: false,
          error: 'Invalid email format',
        };
      }

      // Validate password
      if (!password || password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters',
        };
      }

      logger.debug('Attempting login', { email }, 'Auth');
      
      // Retry with exponential backoff
      const result = await retry(
        async () => {
          const mutationResult = await loginMutation({
            variables: { email: email.trim().toLowerCase(), password },
          });
          
          const { data, errors } = mutationResult || {};
          
          if (errors && errors.length > 0) {
            throw new Error(errors[0]?.message || 'Login failed');
          }
          
          if (!data?.login) {
            throw new Error('Login failed: No data received');
          }
          
          return data.login;
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Retrying login (attempt ${attempt})`, { error: error.message }, 'Auth');
          },
        }
      );
      
      logger.info('Login successful', { email }, 'Auth');
      await handleAuthSuccess(result);
      return { success: true };
    } catch (error) {
      logger.error('Login error', error instanceof Error ? error : new Error(String(error)), 'Auth');
      const errorMessage = error instanceof Error ? error.message : (error as NetworkError)?.message || 'Login failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate and sanitize inputs
      const sanitizedName = sanitizeName(name);
      if (!sanitizedName || sanitizedName.trim().length < 2) {
        return {
          success: false,
          error: 'Name must be at least 2 characters',
        };
      }

      if (!validateEmail(email)) {
        return {
          success: false,
          error: 'Invalid email format',
        };
      }

      if (!password || password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters',
        };
      }

      logger.debug('Attempting registration', { email }, 'Auth');
      const { data, errors } = await registerMutation({
        variables: { name: sanitizedName, email: email.trim().toLowerCase(), password },
      });
      
      if (errors && errors.length > 0) {
        logger.error('Registration failed - GraphQL errors', errors, 'Auth');
        return {
          success: false,
          error: errors[0]?.message || 'Registration failed',
        };
      }

      if (data?.register) {
        logger.info('Registration successful', { email }, 'Auth');
        await handleAuthSuccess(data.register);
        return { success: true };
      }
      
      logger.warn('Registration failed - No data in response', {}, 'Auth');
      return { success: false, error: 'Registration failed: No data received' };
    } catch (error) {
      logger.error('Registration error', error instanceof Error ? error : new Error(String(error)), 'Auth');
      const errorMessage = error instanceof Error ? error.message : (error as NetworkError)?.message || 'Registration failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const loginWithGoogle = async (credential: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!credential || credential.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid Google credential',
        };
      }

      logger.debug('Attempting Google login', {}, 'Auth');
      const { data, errors } = await googleLoginMutation({
        variables: { credential },
      });
      
      if (errors && errors.length > 0) {
        logger.error('Google login failed - GraphQL errors', errors, 'Auth');
        return {
          success: false,
          error: errors[0]?.message || 'Google login failed',
        };
      }

      if (data?.googleLogin) {
        logger.info('Google login successful', { email: data.googleLogin.user?.email }, 'Auth');
        await handleAuthSuccess(data.googleLogin);
        return { success: true };
      }
      
      logger.warn('Google login failed - No data in response', {}, 'Auth');
      return { success: false, error: 'Google login failed: No data received' };
    } catch (error) {
      logger.error('Google login error', error instanceof Error ? error : new Error(String(error)), 'Auth');
      const errorMessage = error instanceof Error ? error.message : (error as NetworkError)?.message || 'Google login failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async (): Promise<void> => {
    logger.info('Logging out', { userId: state.user?.id }, 'Auth');
    // Clear Apollo cache on logout
    await apolloClient.clearStore();
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    login,
    register,
    loginWithGoogle,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

