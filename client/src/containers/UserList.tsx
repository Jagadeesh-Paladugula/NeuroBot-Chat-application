import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import api from '../api/api';
import Loader from '../components/Loader';
import UserAvatar from '../components/UserAvatar';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  isOnline?: boolean;
  isDemo?: boolean;
}

interface UserListProps {
  onSelectUser: (user: User) => void;
  onClose: () => void;
  currentUserId?: string;
  initialSearchTerm?: string;
  highlightUserId?: string | null;
}

const UserListOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const UserListModal = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const UserListHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
  &:hover {
    background: #f3f4f6;
  }
`;

const UserListSearch = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    &:focus {
      border-color: #667eea;
    }
  }
`;

const UserListContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
`;

const UserListItem = styled.div<{ $highlighted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  background: ${props => props.$highlighted 
    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(129, 140, 248, 0.18))'
    : 'transparent'};
  border-left: ${props => props.$highlighted ? '4px solid rgba(99, 102, 241, 0.6)' : 'none'};
  &:hover {
    background: ${props => props.$highlighted
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(129, 140, 248, 0.22))'
      : '#f9fafb'};
  }
`;

const UserListItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserListItemName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
`;

const DemoBadge = styled.span`
  background: #f59e0b;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
`;

const UserListItemEmail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
`;

const OnlineBadge = styled.span`
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 500;
`;

const NoUsers = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
`;

const UserListLoader = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const UserList = ({
  onSelectUser,
  onClose,
  currentUserId,
  initialSearchTerm = '',
  highlightUserId = null,
}: UserListProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const highlightedUserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get<{ users: User[] }>('/conversations/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredUsers = useMemo(() => 
    users
      .filter((user) => (user._id || user.id)?.toString() !== (currentUserId?.toString?.() || ''))
      .filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, currentUserId, searchTerm]
  );

  useEffect(() => {
    if (highlightedUserRef.current) {
      highlightedUserRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [filteredUsers, highlightUserId]);

  if (loading) {
    return (
      <UserListOverlay onClick={onClose}>
        <UserListModal onClick={(e) => e.stopPropagation()}>
          <UserListLoader>
            <Loader message="Loading users..." />
          </UserListLoader>
        </UserListModal>
      </UserListOverlay>
    );
  }

  return (
    <UserListOverlay onClick={onClose}>
      <UserListModal onClick={(e) => e.stopPropagation()}>
        <UserListHeader>
          <h3>Start New Conversation</h3>
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </UserListHeader>
        <UserListSearch>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </UserListSearch>
        <UserListContent>
          {filteredUsers.length === 0 ? (
            <NoUsers>No users found</NoUsers>
          ) : (
            filteredUsers.map((user) => {
              const userIdStr = (user._id || user.id)?.toString?.() || '';
              const isHighlighted =
                highlightUserId &&
                userIdStr &&
                userIdStr === highlightUserId.toString();

              return (
              <UserListItem
                key={userIdStr || user.email}
                ref={isHighlighted ? highlightedUserRef : null}
                $highlighted={isHighlighted}
                onClick={() => onSelectUser(user)}
              >
                <UserAvatar user={user} size={45} />
                <UserListItemInfo>
                  <UserListItemName>
                    {user.email === 'assistant@demo.com' ? 'NeuroBot AI' : user.name}
                    {user.isDemo && <DemoBadge>Demo</DemoBadge>}
                  </UserListItemName>
                  <UserListItemEmail>{user.email}</UserListItemEmail>
                </UserListItemInfo>
                {user.isOnline && <OnlineBadge>Online</OnlineBadge>}
              </UserListItem>
              );
            })
          )}
        </UserListContent>
      </UserListModal>
    </UserListOverlay>
  );
};

export default UserList;

