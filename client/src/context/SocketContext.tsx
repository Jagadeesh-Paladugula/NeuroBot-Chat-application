import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getEnvConfig } from '../utils/env';
import { logger } from '../utils/logger';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  reconnectAttempts: number;
}

type SocketAction =
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_RECONNECT_ATTEMPTS' }
  | { type: 'RESET' };

const initialState: SocketState = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second

const socketReducer = (state: SocketState, action: SocketAction): SocketState => {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: state.reconnectAttempts + 1 };
    case 'RESET_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: 0 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emitMessageSeen: (params: { messageId: string; conversationId?: string | { _id?: string; id?: string } }) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user, token } = useAuth();
  const [state, dispatch] = useReducer(socketReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const envConfig = getEnvConfig();

  useEffect(() => {
    if (!user || !token) {
      dispatch({ type: 'RESET' });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    const socketUrl = envConfig.socketUrl;
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_BASE,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      timeout: 20000,
    });

    socketRef.current = newSocket;
    dispatch({ type: 'SET_SOCKET', payload: newSocket });

    newSocket.on('connect', () => {
      logger.info('Socket connected', { userId: user.id }, 'Socket');
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
      // Register user
      newSocket.emit('addUser', { userId: user.id });
    });

    newSocket.on('disconnect', (reason) => {
      logger.warn('Socket disconnected', { reason }, 'Socket');
      dispatch({ type: 'SET_CONNECTED', payload: false });
      
      // If disconnect was not intentional, attempt to reconnect
      // Note: Socket.io handles reconnection automatically, this is for manual handling
      if (reason === 'io server disconnect') {
        logger.info('Server disconnected socket, will attempt reconnection', {}, 'Socket');
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      logger.error('Socket connection error', error, 'Socket');
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      logger.info('Socket reconnection attempt', { attemptNumber }, 'Socket');
      dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });
    });

    newSocket.on('reconnect_failed', () => {
      logger.error('Socket reconnection failed', {}, 'Socket');
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (newSocket) {
        newSocket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token, envConfig.socketUrl]);

  const emitMessageSeen = ({ messageId, conversationId }: { messageId: string; conversationId?: string | { _id?: string; id?: string } }): void => {
    if (!state.socket || !state.isConnected) {
      logger.warn('Cannot emit messageSeen - socket not connected', {}, 'Socket');
      return;
    }
    
    try {
      state.socket.emit('messageSeen', { messageId, conversationId });
      if (conversationId) {
        const normalizedConversationId =
          typeof conversationId === 'object'
            ? conversationId?._id?.toString?.() ||
              conversationId?.id?.toString?.() ||
              conversationId.toString?.()
            : conversationId?.toString?.();
        window.dispatchEvent(
          new CustomEvent('conversationRead', { detail: { conversationId: normalizedConversationId } })
        );
      }
    } catch (error) {
      logger.error('Error emitting messageSeen', error, 'Socket');
    }
  };

  const value: SocketContextType = {
    socket: state.socket,
    isConnected: state.isConnected,
    emitMessageSeen,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

