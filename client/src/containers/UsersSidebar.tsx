import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import Loader from '../components/Loader';
import UserAvatar from '../components/UserAvatar';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string | Date;
  isDemo?: boolean;
}

const UsersSidebarContainer = styled.div`
  width: 280px;
  background: rgba(255, 255, 255, 0.92);
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  height: 100vh;
  backdrop-filter: blur(18px);
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.08);
  .dark-mode & {
    background: rgba(17, 24, 39, 0.88);
    border-left-color: rgba(148, 163, 184, 0.12);
    box-shadow: -24px 0 44px rgba(2, 6, 23, 0.55);
  }

  @media (max-width: 1200px) {
    width: 240px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const UsersSidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.12);
  }
  h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #0f172a;
    .dark-mode & {
      color: #e2e8f0;
    }
  }
`;

const UsersCount = styled.div`
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 999px;
`;

const UsersSidebarSearch = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.12);
  }
  input {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    background: rgba(255, 255, 255, 0.92);
    .dark-mode & {
      background: rgba(15, 23, 42, 0.75);
      border-color: rgba(148, 163, 184, 0.25);
      color: #f8fafc;
    }
    &:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      .dark-mode & {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
      }
    }
  }
`;

const UsersSidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
`;

const UsersSidebarLoading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const UserSidebarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 22px;
  transition: background 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  &:hover {
    background: rgba(79, 70, 229, 0.06);
    border-bottom-color: rgba(79, 70, 229, 0.12);
  }
  .dark-mode & {
    &:hover {
      background: rgba(79, 70, 229, 0.18);
      border-bottom-color: rgba(129, 140, 248, 0.22);
    }
  }
`;

const UserSidebarInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserSidebarName = styled.div`
  font-weight: 500;
  color: #0f172a;
  font-size: 0.96rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  .dark-mode & {
    color: #e2e8f0;
  }
`;

const UserSidebarStatus = styled.div`
  font-size: 0.8rem;
`;

const StatusOnline = styled.span`
  color: #10b981;
`;

const StatusRecent = styled.span`
  color: #3b82f6;
`;

const StatusOffline = styled.span`
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const DemoBadge = styled.span`
  background: #f59e0b;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
`;

const AIBadge = styled.span`
  background: #6366f1;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
`;

const NoUsers = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const UsersSidebar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      console.log('👥 Fetching users in UsersSidebar...');
      const response = await api.get<{ users: User[] }>('/conversations/users');
      console.log('👥 Full response object:', response);
      console.log('👥 Response.data:', response.data);
      console.log('👥 Response.data.users:', response.data?.users);
      console.log('👥 Users array type:', Array.isArray(response.data?.users));
      console.log('👥 Users array length:', response.data?.users?.length);
      
      if (!response || !response.data) {
        console.error('❌ No response or response.data:', response);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      if (!response.data.users) {
        console.error('❌ No users in response.data:', response.data);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      if (!Array.isArray(response.data.users)) {
        console.error('❌ users is not an array:', typeof response.data.users, response.data.users);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // Sort users by last seen (online first, then by lastSeen time)
      const sortedUsers = [...response.data.users].sort((a, b) => {
        // Online users first
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        // Then sort by lastSeen (most recent first)
        const aLastSeen = new Date(a.lastSeen || 0);
        const bLastSeen = new Date(b.lastSeen || 0);
        return bLastSeen.getTime() - aLastSeen.getTime();
      });
      
      console.log('✅ Sorted users:', sortedUsers);
      console.log('✅ Setting users count:', sortedUsers.length);
      setUsers(sortedUsers);
    } catch (error: any) {
      console.error('❌ Failed to fetch users:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    
    // Refresh users every 30 seconds to update last seen
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserClick = async (clickedUser: User) => {
    // Don't allow clicking on self
    if (clickedUser._id === user?.id || clickedUser.id === user?.id) {
      return;
    }

    try {
      const clickedUserId = clickedUser._id || clickedUser.id;
      
      // Check if conversation already exists - more robust check
      const conversationsResponse = await api.get<{ conversations: Array<{ type?: string; id?: string; participant?: User }> }>('/conversations');
      const existingConv = conversationsResponse.data.conversations.find(
        (conv) => {
          if (conv.type !== 'one-to-one') return false;
          const participantId = conv.participant?._id || conv.participant?.id;
          return participantId && (
            participantId.toString() === clickedUserId?.toString() ||
            participantId === clickedUserId
          );
        }
      );

      if (existingConv && existingConv.id) {
        navigate(`/chats/${existingConv.id}`);
        return;
      }

      // Create new conversation (server will check for duplicates)
      const response = await api.post<{ conversation: { id: string } }>('/conversations', {
        participantId: clickedUserId,
      });

      // Navigate to the conversation (use the one from response, which might be existing)
      navigate(`/chats/${response.data.conversation.id}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const getStatusDisplay = (user: User) => {
    if (user.isOnline) {
      return <StatusOnline>● Online</StatusOnline>;
    }
    
    if (user.lastSeen) {
      const lastSeenDate = new Date(user.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return <StatusRecent>● Just now</StatusRecent>;
      } else if (diffMinutes < 60) {
        return <StatusRecent>● {diffMinutes}m ago</StatusRecent>;
      } else {
        return (
          <StatusOffline>
            ● {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
          </StatusOffline>
        );
      }
    }
    
    return <StatusOffline>● Offline</StatusOffline>;
  };

  if (loading) {
    return (
      <UsersSidebarContainer>
        <UsersSidebarHeader>
          <h3>All Users</h3>
          <UsersCount>--</UsersCount>
        </UsersSidebarHeader>
        <UsersSidebarLoading>
          <Loader message="Loading teammates..." />
        </UsersSidebarLoading>
      </UsersSidebarContainer>
    );
  }

  return (
    <UsersSidebarContainer>
      <UsersSidebarHeader>
        <h3>All Users</h3>
        <UsersCount>{users.length}</UsersCount>
      </UsersSidebarHeader>
      
      <UsersSidebarSearch>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </UsersSidebarSearch>

      <UsersSidebarContent>
        {filteredUsers.length === 0 ? (
          <NoUsers>No users found</NoUsers>
        ) : (
          filteredUsers.map((sidebarUser) => {
            // Don't show current user in the list
            if (sidebarUser._id === user?.id || sidebarUser.id === user?.id) {
              return null;
            }
            
            const isAssistant = sidebarUser.email === 'assistant@demo.com';
            const sidebarDisplayName = isAssistant
              ? 'NeuroBot AI'
              : sidebarUser.name;
            
            return (
              <UserSidebarItem 
                key={sidebarUser._id || sidebarUser.id} 
                onClick={() => handleUserClick(sidebarUser)}
              >
                <UserAvatar user={sidebarUser} size={40} />
                <UserSidebarInfo>
                  <UserSidebarName>
                    {sidebarDisplayName}
                    {sidebarUser.isDemo && <DemoBadge>Demo</DemoBadge>}
                    {isAssistant && (
                      <AIBadge>AI</AIBadge>
                    )}
                  </UserSidebarName>
                  <UserSidebarStatus>
                    {getStatusDisplay(sidebarUser)}
                  </UserSidebarStatus>
                </UserSidebarInfo>
              </UserSidebarItem>
            );
          })
        )}
      </UsersSidebarContent>
    </UsersSidebarContainer>
  );
};

export default UsersSidebar;

