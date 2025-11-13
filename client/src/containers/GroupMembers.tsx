import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: string | Date;
}

interface Conversation {
  id?: string;
  name?: string;
  participants?: User[];
  admins?: Array<User | string>;
  createdBy?: User | string;
}

interface GroupMembersProps {
  conversation: Conversation | null;
  onClose: () => void;
}

const GroupMembersOverlay = styled.div`
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

const GroupMembersModal = styled.div`
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

const GroupMembersHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  .dark-mode & {
    border-bottom-color: #3a3a3a;
  }
  h3 {
    margin: 0 0 4px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    .dark-mode & {
      color: #e5e5e5;
    }
  }
`;

const GroupMembersSubtitle = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
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
  flex-shrink: 0;
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

const GroupMembersContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
`;

const GroupMembersSection = styled.div`
  padding: 10px 20px;
`;

const SectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const GroupMemberItem = styled.div<{ $isAdmin?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  transition: background 0.2s;
  border-left: ${props => props.$isAdmin ? '3px solid #667eea' : 'none'};
  padding-left: ${props => props.$isAdmin ? '17px' : '0'};
  &:hover {
    background: #f9fafb;
  }
  .dark-mode & {
    &:hover {
      background: #3a3a3a;
    }
  }
`;

const GroupMemberInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GroupMemberName = styled.div`
  font-weight: 500;
  color: #111827;
  font-size: 0.95rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  .dark-mode & {
    color: #e5e5e5;
  }
`;

const GroupMemberStatus = styled.div`
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

const CreatorBadge = styled.span`
  background: #f59e0b;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
`;

const AdminBadge = styled.span`
  background: #667eea;
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

const NoMembers = styled.div`
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const GroupMembers = ({ conversation, onClose }: GroupMembersProps) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Array<User | string>>([]);
  const [createdBy, setCreatedBy] = useState<User | string | null>(null);

  useEffect(() => {
    if (conversation) {
      setParticipants(conversation.participants || []);
      setAdmins(conversation.admins || []);
      setCreatedBy(conversation.createdBy || null);
    }
  }, [conversation]);

  const isAdmin = (userId: string | undefined): boolean => {
    if (!userId) return false;
    const userIdStr = userId.toString();
    return admins.some(admin => {
      const adminId = typeof admin === 'object' ? (admin._id || admin.id) : admin;
      return adminId && adminId.toString() === userIdStr;
    });
  };

  const isCreator = (userId: string | undefined): boolean => {
    if (!userId || !createdBy) return false;
    const userIdStr = userId.toString();
    const creatorId = typeof createdBy === 'object' ? (createdBy._id || createdBy.id) : createdBy;
    return creatorId && creatorId.toString() === userIdStr;
  };

  const getStatusDisplay = (participant: User) => {
    if (participant.isOnline) {
      return <StatusOnline>● Online</StatusOnline>;
    }
    
    if (participant.lastSeen) {
      const lastSeenDate = new Date(participant.lastSeen);
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

  if (!conversation) return null;

  return (
    <GroupMembersOverlay onClick={onClose}>
      <GroupMembersModal onClick={(e) => e.stopPropagation()}>
        <GroupMembersHeader>
          <div>
            <h3>{conversation.name || 'Group Chat'}</h3>
            <GroupMembersSubtitle>{participants.length} members</GroupMembersSubtitle>
          </div>
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </GroupMembersHeader>

        <GroupMembersContent>
          {admins.length > 0 && (
            <GroupMembersSection>
              <SectionTitle>Admins</SectionTitle>
              {participants
                .filter(p => {
                  const participantId = p._id || p.id;
                  return participantId && isAdmin(participantId);
                })
                .map((participant) => {
                  const participantId = participant._id || participant.id;
                  return (
                    <GroupMemberItem key={participantId} $isAdmin>
                      <UserAvatar user={participant} size={45} />
                      <GroupMemberInfo>
                        <GroupMemberName>
                          {participant.name}
                          {participantId && isCreator(participantId) && (
                            <CreatorBadge>Creator</CreatorBadge>
                          )}
                          <AdminBadge>Admin</AdminBadge>
                        </GroupMemberName>
                        <GroupMemberStatus>
                          {getStatusDisplay(participant)}
                        </GroupMemberStatus>
                      </GroupMemberInfo>
                    </GroupMemberItem>
                  );
                })}
            </GroupMembersSection>
          )}

          <GroupMembersSection>
            <SectionTitle>Members</SectionTitle>
            {participants
              .filter(p => {
                const participantId = p._id || p.id;
                return participantId && !isAdmin(participantId);
              })
              .map((participant) => {
                const participantId = participant._id || participant.id;
                return (
                  <GroupMemberItem key={participantId}>
                    <UserAvatar user={participant} size={45} />
                    <GroupMemberInfo>
                      <GroupMemberName>
                        {participant.name}
                        {participantId && isCreator(participantId) && !isAdmin(participantId) && (
                          <CreatorBadge>Creator</CreatorBadge>
                        )}
                        {participant.email === 'assistant@demo.com' && (
                          <AIBadge>AI</AIBadge>
                        )}
                      </GroupMemberName>
                      <GroupMemberStatus>
                        {getStatusDisplay(participant)}
                      </GroupMemberStatus>
                    </GroupMemberInfo>
                  </GroupMemberItem>
                );
              })}
            {participants.filter(p => {
              const participantId = p._id || p.id;
              return participantId && !isAdmin(participantId);
            }).length === 0 && (
              <NoMembers>All members are admins</NoMembers>
            )}
          </GroupMembersSection>
        </GroupMembersContent>
      </GroupMembersModal>
    </GroupMembersOverlay>
  );
};

export default GroupMembers;

