import { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import styled from 'styled-components';
import api from '../api/api';
import Loader from '../components/Loader';
import UserAvatar from '../components/UserAvatar';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  isDemo?: boolean;
}

interface GroupCreatorProps {
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
}

const GroupCreatorOverlay = styled.div`
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

const GroupCreatorModal = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  .dark-mode & {
    background: #2a2a2a;
  }
`;

const GroupCreatorHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .dark-mode & {
    border-bottom-color: #3a3a3a;
  }
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    .dark-mode & {
      color: #e5e5e5;
    }
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
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
  .dark-mode & {
    color: #9ca3af;
    &:hover {
      background: #3a3a3a;
    }
  }
`;

const GroupCreatorName = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  .dark-mode & {
    border-bottom-color: #3a3a3a;
  }
  label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
    .dark-mode & {
      color: #e5e5e5;
    }
  }
  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    &:focus {
      border-color: #667eea;
    }
    .dark-mode & {
      background: #1a1a1a;
      border-color: #3a3a3a;
      color: #e5e5e5;
    }
  }
`;

const GroupNameHint = styled.div`
  font-size: 0.8rem;
  color: #ef4444;
  margin-top: 6px;
  .dark-mode & {
    color: #f87171;
  }
`;

const GroupCreatorSearch = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  .dark-mode & {
    border-bottom-color: #3a3a3a;
  }
  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    .dark-mode & {
      background: #1a1a1a;
      border-color: #3a3a3a;
      color: #e5e5e5;
    }
  }
`;

const SelectedUsers = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  max-height: 100px;
  overflow-y: auto;
  .dark-mode & {
    border-bottom-color: #3a3a3a;
  }
`;

const SelectedUsersLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const SelectedUsersTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SelectedUserTag = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #667eea;
  color: white;
  border-radius: 16px;
  font-size: 0.85rem;
`;

const RemoveUserBtn = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const GroupCreatorContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
`;

const GroupCreatorLoader = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const GroupCreatorItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  background: ${props => props.$selected 
    ? 'rgba(102, 126, 234, 0.1)' 
    : 'transparent'};
  .dark-mode & {
    background: ${props => props.$selected 
      ? 'rgba(102, 126, 234, 0.2)' 
      : 'transparent'};
    &:hover {
      background: #3a3a3a;
    }
  }
  &:hover {
    background: #f3f4f6;
  }
`;

const GroupCreatorItemInfo = styled.div`
  flex: 1;
`;

const GroupCreatorItemName = styled.div`
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
  .dark-mode & {
    color: #e5e5e5;
  }
`;

const DemoBadge = styled.span`
  background: #f59e0b;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
`;

const GroupCreatorItemEmail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const CheckMark = styled.span`
  color: #667eea;
  font-size: 1.2rem;
  font-weight: bold;
`;

const GroupCreatorFooter = styled.div`
  padding: 15px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  .dark-mode & {
    border-top-color: #3a3a3a;
  }
`;

const CancelBtn = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  background: #f3f4f6;
  color: #111827;
  border: none;
  .dark-mode & {
    background: #3a3a3a;
    color: #e5e5e5;
  }
`;

const CreateBtn = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NoUsers = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const GroupCreator = ({ onClose, onSuccess }: GroupCreatorProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showGroupNameHint, setShowGroupNameHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const toggleUserSelection = useCallback((user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => (u._id || u.id) === (user._id || user.id));
      if (isSelected) {
        return prev.filter((u) => (u._id || u.id) !== (user._id || user.id));
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleGroupNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setGroupName(value);
    setShowGroupNameHint((prev) => prev && !value.trim() ? prev : false);
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName || !groupName.trim()) {
      setShowGroupNameHint(true);
    }

    if (!groupName || !groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedUsers.length < 1) {
      alert('Please select at least one user to create a group');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post<{ conversation: { id: string } }>('/conversations', {
        participantIds: selectedUsers.map((u) => u._id || u.id),
        name: groupName.trim(),
        type: 'group',
      });

      onSuccess(response.data.conversation.id);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [groupName, selectedUsers, onSuccess]);

  const filteredUsers = useMemo(() => 
    users.filter((user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [users, searchTerm]
  );

  if (loading) {
    return (
      <GroupCreatorOverlay onClick={onClose}>
        <GroupCreatorModal onClick={(e) => e.stopPropagation()}>
          <GroupCreatorLoader>
            <Loader message="Loading users..." />
          </GroupCreatorLoader>
        </GroupCreatorModal>
      </GroupCreatorOverlay>
    );
  }

  return (
    <GroupCreatorOverlay onClick={onClose}>
      <GroupCreatorModal onClick={(e) => e.stopPropagation()}>
        <GroupCreatorHeader>
          <h3>Create Group Chat</h3>
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </GroupCreatorHeader>

        <GroupCreatorName>
          <label htmlFor="group-name-input">Group Name *</label>
          <input
            id="group-name-input"
            type="text"
            placeholder="Enter group name (required)"
            value={groupName}
            onChange={handleGroupNameChange}
            required
            autoFocus
          />
          {showGroupNameHint && !groupName.trim() && (
            <GroupNameHint>Please enter a group name to continue</GroupNameHint>
          )}
        </GroupCreatorName>

        <GroupCreatorSearch>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </GroupCreatorSearch>

        <SelectedUsers>
          {selectedUsers.length > 0 && (
            <>
              <SelectedUsersLabel>Selected ({selectedUsers.length}):</SelectedUsersLabel>
              <SelectedUsersTags>
                {selectedUsers.map((user) => {
                  const displayName =
                    user.email === 'assistant@demo.com'
                      ? 'NeuroBot AI'
                      : user.name;
                  return (
                  <SelectedUserTag key={user._id || user.id}>
                    {displayName}
                    <RemoveUserBtn
                      onClick={() => toggleUserSelection(user)}
                    >
                      ×
                    </RemoveUserBtn>
                  </SelectedUserTag>
                  );
                })}
              </SelectedUsersTags>
            </>
          )}
        </SelectedUsers>

        <GroupCreatorContent>
          {filteredUsers.length === 0 ? (
            <NoUsers>No users found</NoUsers>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUsers.some(
                (u) => (u._id || u.id) === (user._id || user.id)
              );
              const displayName =
                user.email === 'assistant@demo.com' ? 'NeuroBot AI' : user.name;
              return (
                <GroupCreatorItem
                  key={user._id || user.id}
                  $selected={isSelected}
                  onClick={() => toggleUserSelection(user)}
                >
                  <UserAvatar user={user} size={45} />
                  <GroupCreatorItemInfo>
                    <GroupCreatorItemName>
                      {displayName}
                      {user.isDemo && <DemoBadge>Demo</DemoBadge>}
                    </GroupCreatorItemName>
                    <GroupCreatorItemEmail>{user.email}</GroupCreatorItemEmail>
                  </GroupCreatorItemInfo>
                  {isSelected && <CheckMark>✓</CheckMark>}
                </GroupCreatorItem>
              );
            })
          )}
        </GroupCreatorContent>

        <GroupCreatorFooter>
          <CancelBtn onClick={onClose}>
            Cancel
          </CancelBtn>
          <CreateBtn
            onClick={handleCreateGroup}
            disabled={!groupName || !groupName.trim() || selectedUsers.length < 1 || creating}
          >
            {creating ? 'Creating...' : `Create Group (${selectedUsers.length})`}
          </CreateBtn>
        </GroupCreatorFooter>
      </GroupCreatorModal>
    </GroupCreatorOverlay>
  );
};

export default GroupCreator;

