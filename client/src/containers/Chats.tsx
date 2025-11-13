import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { requestNotificationPermission, showMessageNotification } from '../utils/notifications';
import { enrichConversationSummaries } from '../utils/summaries';
import api, { updateProfile as updateProfileAPI, deleteAccount as deleteAccountAPI } from '../api/api';
import ChatList from '../components/ChatList';
import UserList from './UserList';
import GroupCreator from './GroupCreator';
import UsersSidebar from './UsersSidebar';
import UserAvatar from '../components/UserAvatar';
import MainSidebar from '../components/MainSidebar';
import SettingsPanel from '../components/SettingsPanel';
import { Conversation, User, Message } from '../types';


const ChatsContainer = styled.div`
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #eff4ff 0%, #f6f7fb 55%, #ffffff 100%);
  position: relative;
  color: #0f172a;

  .dark-mode & {
    background: radial-gradient(circle at top, rgba(30, 41, 59, 0.8) 0%, #0b1120 70%);
    color: #e2e8f0;
  }

  @media (max-width: 960px) {
    padding-left: 0;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    padding-bottom: 70px;
  }
`;

const ChatsSidebar = styled.div`
  width: 340px;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(18px);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 32px 60px rgba(15, 23, 42, 0.08);

  .dark-mode & {
    background: rgba(17, 24, 39, 0.86);
    border-right-color: rgba(148, 163, 184, 0.08);
    box-shadow: 0 26px 50px rgba(2, 6, 23, 0.65);
  }

  @media (max-width: 1200px) {
    width: 320px;
  }

  @media (max-width: 960px) {
    width: 300px;
  }

  @media (max-width: 768px) {
    width: 100%;
    max-width: none;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;

    .dark-mode & {
      border-bottom-color: #1f2937;
    }
  }
`;

const ChatsHeader = styled.div`
  padding: 22px 24px 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;

  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.08);
  }
`;

const SidebarAppTitle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`;

const AppBrand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0;
`;

// Natural, subtle animations for NeuroBot text
const subtleGradientShift = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 20% 50%;
  }
`;

const AppName = styled.span`
  font-family: 'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: default;
  user-select: none;
  position: relative;
  display: inline-block;
  
  /* Subtle gradient text with very slow, natural animation */
  background: linear-gradient(
    135deg,
    #6366f1 0%,
    #7c3aed 30%,
    #8b5cf6 60%,
    #6366f1 100%
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${subtleGradientShift} 8s ease-in-out infinite;
  
  /* Very subtle text shadow for depth */
  filter: drop-shadow(0 1px 2px rgba(99, 102, 241, 0.15));

  .dark-mode & {
    background: linear-gradient(
      135deg,
      #818cf8 0%,
      #a78bfa 30%,
      #c084fc 60%,
      #818cf8 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${subtleGradientShift} 8s ease-in-out infinite;
    filter: drop-shadow(0 1px 3px rgba(129, 140, 248, 0.2));
  }

  /* Natural hover effect */
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              filter 0.2s ease,
              opacity 0.2s ease;
  
  &:hover {
    transform: scale(1.01);
    opacity: 0.95;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #0f172a;
  font-size: 1.05rem;

  .dark-mode & {
    color: #f8fafc;
  }
`;

const ConnectionStatus = styled.div`
  font-size: 0.85rem;
  margin-top: 4px;
  color: #64748b;

  .dark-mode & {
    color: #94a3b8;
  }
`;

const StatusOnline = styled.span`
  color: #10b981;
`;

const StatusOffline = styled.span`
  color: #9ca3af;
`;

const NewChatButtonContainer = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;

  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.08);
  }
`;

const NewChatButton = styled.button<{ $isGroup?: boolean }>`
  width: 100%;
  padding: 12px;
  background: ${props => props.$isGroup 
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
  box-shadow: ${props => props.$isGroup
    ? '0 8px 20px rgba(16, 185, 129, 0.18)'
    : '0 8px 20px rgba(79, 70, 229, 0.18)'};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.95;
    box-shadow: ${props => props.$isGroup
      ? '0 12px 24px rgba(5, 150, 105, 0.22)'
      : '0 12px 24px rgba(79, 70, 229, 0.25)'};
  }
`;

const ChatsMain = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 42px;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 24px;
  box-shadow: 0 26px 50px rgba(15, 23, 42, 0.12);

  .dark-mode & {
    background: rgba(30, 41, 59, 0.92);
    color: #cbd5f5;
    box-shadow: 0 28px 55px rgba(2, 6, 23, 0.55);
  }
`;

const EmptyIcon = styled.div`
  font-size: 3.5rem;
  margin-bottom: 12px;
`;

const EmptyStateTitle = styled.h2`
  font-size: 1.4rem;
  margin-bottom: 6px;
  color: #1f2937;

  .dark-mode & {
    color: #f8fafc;
  }
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
`;

const Chats = () => {
  const { user, logout, fetchUser } = useAuth();
  const { socket, isConnected } = useSocket();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [activeSection, setActiveSection] = useState<'messages' | 'groups'>('messages');
  const [showSettings, setShowSettings] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(
    user?.readReceiptsEnabled ?? true
  );
  const [updatingReadReceipts, setUpdatingReadReceipts] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingNewChatTarget, setPendingNewChatTarget] = useState<User | null>(null);
  const [userListInitialSearch, setUserListInitialSearch] = useState('');

  const normalizeConversationId = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object' && value !== null) {
      if ('_id' in value) return String(value._id);
      if ('id' in value) return String(value.id);
    }
    return String(value);
  }, []);

  const normalizeUserId = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object' && value !== null) {
      if ('_id' in value) return String(value._id);
      if ('id' in value) return String(value.id);
    }
    return String(value);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get<{ conversations?: Conversation[] }>('/conversations');
      const currentUserId = normalizeUserId(user?.id || user?._id);
      const fetchedConversations = Array.isArray(response.data?.conversations)
        ? response.data.conversations.map((conv) => {
            const enriched = enrichConversationSummaries(conv);
            // Safety check: If lastMessage is from current user, unreadCount should be 0
            if (enriched.lastMessage) {
              const lastMessageSenderId = normalizeUserId(
                enriched.lastMessage.senderId?._id || 
                enriched.lastMessage.senderId?.id || 
                enriched.lastMessage.senderId
              );
              if (lastMessageSenderId === currentUserId) {
                return { ...enriched, unreadCount: 0 };
              }
            }
            return enriched;
          })
        : [];
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    // Request notification permission on mount
    requestNotificationPermission();
    
    // Listen for conversation read events to refresh unread counts
    const handleConversationRead = (event: CustomEvent<{ conversationId?: unknown }>) => {
      const readConversationId = normalizeConversationId(event?.detail?.conversationId);
      if (!readConversationId) return;

      setConversations((prev) => {
        const previous = Array.isArray(prev) ? [...prev] : [];
        return previous.map((conv) => {
          const convId = normalizeConversationId(conv.id || conv._id);
          if (convId === readConversationId) {
            return {
              ...conv,
              unreadCount: 0,
            };
          }
          return conv;
        });
      });
    };
    
    window.addEventListener('conversationRead', handleConversationRead as EventListener);
    
    return () => {
      window.removeEventListener('conversationRead', handleConversationRead as EventListener);
    };
  }, [fetchConversations]);

  useEffect(() => {
    setReadReceiptsEnabled(user?.readReceiptsEnabled ?? true);
  }, [user?.readReceiptsEnabled]);

  useEffect(() => {
    if (location.state && typeof location.state === 'object' && 'reopenUser' in location.state) {
      const reopenUser = location.state.reopenUser as User;
      setPendingNewChatTarget(reopenUser);
      setUserListInitialSearch(
        reopenUser.name || reopenUser.email || ''
      );
      setShowUserList(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: Message }) => {
      const { message } = data;
      const incomingConversationId = normalizeConversationId(message.conversationId);
      const senderIsAssistant = message.senderId?.email === 'assistant@demo.com';
      const senderDisplayName = senderIsAssistant
        ? 'NeuroBot AI'
        : message.senderId?.name || 'Someone';

      setConversations((prev) => {
        // Show notification if message is not from current user
        // Always show notification when on Chats page (not viewing this specific conversation)
        const senderId = normalizeUserId(message.senderId?._id || message.senderId?.id || message.senderId);
        const currentUserId = normalizeUserId(user?.id || user?._id);
        const isFromCurrentUser = senderId === currentUserId;
        
        if (!isFromCurrentUser) {
          const conversation = prev.find(c => c.id === incomingConversationId);
          let conversationName = 'Chat';
          
          if (conversation) {
            if (conversation.type === 'group') {
              conversationName = conversation.name || 'Group Chat';
            } else {
              const participant = conversation.participant;
              if (participant?.email === 'assistant@demo.com') {
                conversationName = 'NeuroBot AI';
              } else {
                conversationName = participant?.name || senderDisplayName;
              }
            }
          }
          
          // Show notification - user is on Chats page, not viewing this specific conversation
          showMessageNotification(message, `${senderDisplayName} in ${conversationName}`);
        }
        
        const updated = prev.map((conv) => {
          if (conv.id === incomingConversationId) {
            // If message is from current user, ensure unreadCount is 0
            // If message is from another user, increment unreadCount
            const currentUnreadCount = conv.unreadCount || 0;
            const newUnreadCount = isFromCurrentUser ? 0 : currentUnreadCount + 1;
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: newUnreadCount,
            };
          }
          return conv;
        });

        // Move conversation to top
        const convIndex = updated.findIndex(
          (c) => c.id === incomingConversationId
        );
        if (convIndex > 0) {
          const [moved] = updated.splice(convIndex, 1);
          updated.unshift(moved);
        }

        // Dispatch conversationUpdated event to sync with other components
        // Only increment if message is NOT from current user
        if (!isFromCurrentUser) {
          window.dispatchEvent(
            new CustomEvent('conversationUpdated', {
              detail: {
                conversationId: incomingConversationId,
                lastMessage: message,
                unreadIncrement: 1,
                lastMessageAt: message.createdAt,
              },
            })
          );
        } else {
          // Message from current user - set unreadCount to 0
          window.dispatchEvent(
            new CustomEvent('conversationUpdated', {
              detail: {
                conversationId: incomingConversationId,
                lastMessage: message,
                unreadCount: 0,
                lastMessageAt: message.createdAt,
              },
            })
          );
        }

        return updated;
      });
    };

    const handleUserOnline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.participant?.id === data.userId || conv.participant?._id === data.userId) {
            return {
              ...conv,
              participant: { ...conv.participant, isOnline: true },
            };
          }
          return conv;
        })
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.participant?.id === data.userId || conv.participant?._id === data.userId) {
            return {
              ...conv,
              participant: { ...conv.participant, isOnline: false },
            };
          }
          return conv;
        })
      );
    };

    const handleConversationDeleted = (payload: { conversationId?: unknown } = {}) => {
      const deletedId = normalizeConversationId(payload.conversationId);
      if (!deletedId) {
        return;
      }

      setConversations((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (conv) => normalizeConversationId(conv.id || conv._id) !== deletedId
        )
      );
    };

    socket.on('getMessage', handleNewMessage);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    socket.on('conversationDeleted', handleConversationDeleted);

    return () => {
      socket.off('getMessage', handleNewMessage);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      socket.off('conversationDeleted', handleConversationDeleted);
    };
  }, [socket, user]);

  const personalConversations = useMemo(
    () => (Array.isArray(conversations) ? conversations : []).filter(
      (conv) => conv.type !== 'group'
    ),
    [conversations]
  );

  const groupConversations = useMemo(
    () => (Array.isArray(conversations) ? conversations : []).filter(
      (conv) => conv.type === 'group'
    ),
    [conversations]
  );

  const unreadMessageCount = useMemo(
    () =>
      personalConversations.reduce(
        (total, conv) => total + (conv.unreadCount || 0),
        0
      ),
    [personalConversations]
  );

  const unreadGroupCount = useMemo(
    () =>
      groupConversations.reduce(
        (total, conv) => total + (conv.unreadCount || 0),
        0
      ),
    [groupConversations]
  );

  const visibleConversations = useMemo(
    () => activeSection === 'groups' ? groupConversations : personalConversations,
    [activeSection, groupConversations, personalConversations]
  );

  const handleSelectConversation = useCallback((conversationId: string) => {
    navigate(`/chats/${conversationId}`);
  }, [navigate]);

  const handleStartConversation = useCallback(async (selectedUser: User) => {
    try {
      const selectedUserId = selectedUser._id || selectedUser.id;
      
      // Check if conversation already exists - more robust check
      const existingConv = conversations.find(
        (conv) => {
          if (conv.type !== 'one-to-one') return false;
          const participantId = conv.participant?._id || conv.participant?.id;
          return participantId && (
            participantId.toString() === selectedUserId?.toString() ||
            participantId === selectedUserId
          );
        }
      );

      if (existingConv && existingConv.id) {
        navigate(`/chats/${existingConv.id}`);
        setShowUserList(false);
        setPendingNewChatTarget(null);
        setUserListInitialSearch('');
        return;
      }

      // Create new conversation (server will check for duplicates)
      const response = await api.post<{ conversation: { id: string } }>('/conversations', {
        participantId: selectedUserId,
      });

      // Refresh conversations list to ensure we have the latest data
      await fetchConversations();

      // Navigate to the conversation (use the one from response, which might be existing)
      navigate(`/chats/${response.data.conversation.id}`);
      setShowUserList(false);
      setPendingNewChatTarget(null);
      setUserListInitialSearch('');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  }, [conversations, fetchConversations, navigate]);

  const handleStartAIConversation = useCallback(async () => {
    try {
      // Check if AI assistant conversation already exists
      const aiConversation = conversations.find((conv) => {
        if (conv.type !== 'one-to-one') return false;
        const participantEmail =
          conv.participant?.email ||
          conv.participants?.find((p) => p?.email === 'assistant@demo.com')?.email;
        return participantEmail === 'assistant@demo.com';
      });

      if (aiConversation && aiConversation.id) {
        navigate(`/chats/${aiConversation.id}`);
        setActiveSection('messages');
        return;
      }

      // Fetch assistant user id
      const usersResponse = await api.get<{ users: User[] }>('/conversations/users');
      const assistantUser = usersResponse.data.users.find(
        (u) => u.email === 'assistant@demo.com'
      );

      if (!assistantUser) {
        alert('NeuroBot assistant is not available right now.');
        return;
      }

      const response = await api.post<{ conversation: { id: string } }>('/conversations', {
        participantId: assistantUser._id || assistantUser.id,
      });

      await fetchConversations();
      navigate(`/chats/${response.data.conversation.id}`);
      setActiveSection('messages');
    } catch (error) {
      console.error('Failed to start AI conversation:', error);
      alert('Could not start a conversation with the NeuroBot assistant. Please try again.');
    }
  }, [conversations, fetchConversations, navigate]);

  const handleNavigateProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  useEffect(() => {
    const handleConversationUpdated = (event: CustomEvent<{
      conversationId?: unknown;
      lastMessage?: Message;
      lastMessageAt?: string | Date;
      unreadCount?: number;
      unreadIncrement?: number;
    }>) => {
      const detail = event?.detail || {};
      const normalizedId = normalizeConversationId(detail.conversationId);
      if (!normalizedId) return;

      // Safety check: Don't increment unread count if the message is from the current user
      const currentUserId = normalizeUserId(user?.id || user?._id);
      const messageSenderId = detail.lastMessage 
        ? normalizeUserId(detail.lastMessage.senderId?._id || detail.lastMessage.senderId?.id || detail.lastMessage.senderId)
        : null;
      const isFromCurrentUser = messageSenderId && messageSenderId === currentUserId;

      setConversations((prev) => {
        const previous = Array.isArray(prev) ? [...prev] : [];
        let updatedIndex = -1;
        const updatedList = previous.map((conv, index) => {
          const convId = normalizeConversationId(conv.id || conv._id);
          if (convId === normalizedId) {
            updatedIndex = index;
            
            // Calculate unreadCount: if message is from current user, don't increment
            let newUnreadCount = conv.unreadCount || 0;
            if (detail.unreadCount !== undefined) {
              // Explicit unreadCount provided - use it (backend should have filtered correctly)
              newUnreadCount = detail.unreadCount;
            } else if (detail.unreadIncrement && !isFromCurrentUser) {
              // Only increment if message is NOT from current user
              newUnreadCount = (conv.unreadCount || 0) + detail.unreadIncrement;
            } else if (isFromCurrentUser) {
              // Message is from current user - ensure unreadCount doesn't increase
              newUnreadCount = conv.unreadCount || 0;
            }
            
            return {
              ...conv,
              lastMessage: detail.lastMessage || conv.lastMessage,
              lastMessageAt:
                detail.lastMessage?.createdAt ||
                detail.lastMessageAt ||
                conv.lastMessageAt,
              unreadCount: newUnreadCount,
            };
          }
          return conv;
        });

        if (updatedIndex > 0) {
          const [moved] = updatedList.splice(updatedIndex, 1);
          updatedList.unshift(moved);
        }

        return updatedList;
      });
    };

    window.addEventListener('conversationUpdated', handleConversationUpdated as EventListener);
    return () => {
      window.removeEventListener('conversationUpdated', handleConversationUpdated as EventListener);
    };
  }, [user]);

  const handleToggleReadReceipts = useCallback(async () => {
    if (updatingReadReceipts) return;

    const nextValue = !readReceiptsEnabled;
    setReadReceiptsEnabled(nextValue);
    setUpdatingReadReceipts(true);

    const result = await updateProfileAPI({ readReceiptsEnabled: nextValue });
    if (!result.success) {
      setReadReceiptsEnabled(!nextValue);
      alert(result.error || 'Failed to update read receipts preference.');
    } else {
      await fetchUser();
    }

    setUpdatingReadReceipts(false);
  }, [updatingReadReceipts, readReceiptsEnabled, fetchUser]);

  const handleDeleteAccount = useCallback(async () => {
    if (deletingAccount) return;

    const confirmed = window.confirm(
      'This will permanently delete your account and all associated messages. Do you want to continue?'
    );
    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    const result = await deleteAccountAPI();
    if (result.success) {
      logout();
      navigate('/');
    } else {
      alert(result.error || 'Failed to delete account. Please try again.');
      setDeletingAccount(false);
    }
  }, [deletingAccount, logout, navigate]);

  return (
    <ChatsContainer>
      <MainSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onStartAIConversation={handleStartAIConversation}
        unreadMessages={unreadMessageCount}
        unreadGroups={unreadGroupCount}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleDarkMode}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={handleNavigateProfile}
        onOpenAnalytics={() => navigate('/analytics')}
        onLogout={logout}
        user={user}
      />
      <ChatsSidebar>
        <ChatsHeader>
          <SidebarAppTitle>
            <AppBrand aria-label="NeuroBot AI workspace">
              <AppName>NeuroBot</AppName>
            </AppBrand>
          </SidebarAppTitle>
          <UserInfo>
            <UserAvatar user={user} size={40} />
            <div>
              <UserName>{user?.name}</UserName>
              <ConnectionStatus>
                {isConnected ? (
                  <StatusOnline>● Online</StatusOnline>
                ) : (
                  <StatusOffline>● Offline</StatusOffline>
                )}
              </ConnectionStatus>
            </div>
          </UserInfo>
        </ChatsHeader>

        <NewChatButtonContainer>
          {activeSection !== 'groups' && (
            <NewChatButton
              onClick={() => {
                setPendingNewChatTarget(null);
                setUserListInitialSearch('');
                setShowUserList(true);
              }}
            >
              + New Chat
            </NewChatButton>
          )}
          <NewChatButton
            $isGroup
            onClick={() => {
              setPendingNewChatTarget(null);
              setUserListInitialSearch('');
              setShowGroupCreator(true);
            }}
            data-tour-id="tour-summary-fallback"
          >
            + Create Group
          </NewChatButton>
        </NewChatButtonContainer>

        <ChatList
          conversations={visibleConversations}
          onSelectConversation={handleSelectConversation}
          loading={loading}
        />

        {showUserList && (
          <UserList
            onSelectUser={handleStartConversation}
            onClose={() => {
              setShowUserList(false);
              setPendingNewChatTarget(null);
              setUserListInitialSearch('');
            }}
            currentUserId={user?.id || user?._id}
            initialSearchTerm={userListInitialSearch}
            highlightUserId={pendingNewChatTarget?.id || pendingNewChatTarget?._id || undefined}
          />
        )}
        {showGroupCreator && (
          <GroupCreator
            onClose={() => setShowGroupCreator(false)}
            onSuccess={async (groupId) => {
              await fetchConversations();
              navigate(`/chats/${groupId}`);
              setShowGroupCreator(false);
            }}
          />
        )}
      </ChatsSidebar>

      <ChatsMain>
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyStateTitle>Select a conversation</EmptyStateTitle>
          <EmptyStateText>Choose a chat from the sidebar to start messaging</EmptyStateText>
        </EmptyState>
      </ChatsMain>

      <UsersSidebar />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        readReceiptsEnabled={readReceiptsEnabled}
        onToggleReadReceipts={handleToggleReadReceipts}
        updatingReadReceipts={updatingReadReceipts}
        onDeleteAccount={handleDeleteAccount}
        deletingAccount={deletingAccount}
      />
    </ChatsContainer>
  );
};

export default Chats;

