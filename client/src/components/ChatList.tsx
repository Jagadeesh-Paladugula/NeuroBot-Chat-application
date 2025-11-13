import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';
import Loader from './Loader';
import UserAvatar from './UserAvatar';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  isDemo?: boolean;
}

interface Message {
  text: string;
  senderId?: User;
  metadata?: {
    isAIMessage?: boolean;
  };
}

interface Conversation {
  id: string;
  type?: 'one-to-one' | 'group';
  name?: string;
  participant?: User;
  participants?: User[];
  lastMessage?: Message;
  lastMessageAt?: string | Date;
  unreadCount?: number;
}

interface ChatListProps {
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
}

const ChatListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const EmptyChats = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
  .dark-mode & {
    color: #9ca3af;
  }
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 15px;
`;

const EmptySubtitle = styled.p`
  font-size: 0.9rem;
  margin-top: 5px;
  color: #9ca3af;
`;

const ChatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  cursor: pointer;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  transition: background 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    background: rgba(79, 70, 229, 0.06);
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.08);
  }
  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.1);
    &:hover {
      background: rgba(79, 70, 229, 0.18);
      box-shadow: inset 0 0 0 1px rgba(165, 180, 252, 0.18);
    }
  }
`;

const ChatItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChatItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ChatItemHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChatItemName = styled.div`
  font-weight: 600;
  color: #0f172a;
  font-size: 0.98rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  .dark-mode & {
    color: #e2e8f0;
  }
`;

const ChatItemTime = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
  margin-left: 10px;
  .dark-mode & {
    color: #94a3b8;
  }
`;

const ChatItemPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  color: #64748b;
  .dark-mode & {
    color: #94a3b8;
  }
`;

const ChatItemText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ChatItemEmpty = styled.span`
  font-style: italic;
  color: #9ca3af;
  .dark-mode & {
    color: #6b7280;
  }
`;

const AIBadge = styled.span`
  background: #6366f1;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
`;

const GroupAvatarSmall = styled.div`
  display: flex;
  gap: -5px;
  position: relative;
  width: 50px;
  height: 50px;
  > * {
    margin-left: -10px;
    border: 2px solid white;
  }
  > *:first-child {
    margin-left: 0;
  }
`;

const GroupBadge = styled.span`
  background: linear-gradient(135deg, #10b981, #0ea5e9);
  color: white;
  font-size: 0.66rem;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 600;
  margin-left: 6px;
  white-space: nowrap;
`;

const UnreadBadge = styled.span`
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.4;
  .dark-mode & {
    background: linear-gradient(135deg, #f87171, #ef4444);
  }
`;

const ChatList = ({ conversations, onSelectConversation, loading }: ChatListProps) => {
  if (loading) {
    return (
      <ChatListContainer>
        <Loader message="Fetching conversations..." compact />
      </ChatListContainer>
    );
  }

  if (conversations.length === 0) {
    return (
      <ChatListContainer>
        <EmptyChats>
          <EmptyIcon>💬</EmptyIcon>
          <p>No conversations yet</p>
          <EmptySubtitle>Start a new chat to get started!</EmptySubtitle>
        </EmptyChats>
      </ChatListContainer>
    );
  }

  return (
    <ChatListContainer>
      {conversations.map((conversation) => {
        const isGroupChat = conversation.type === 'group';
        let displayName = isGroupChat 
          ? (conversation.name || 'Group Chat')
          : conversation.participant?.name;
        
        let displayAvatar = isGroupChat 
          ? conversation.participants?.[0]
          : conversation.participant;
        
        // Handle cases where participant is null/undefined
        if (!isGroupChat && !conversation.participant && conversation.participants) {
          // Try to get participant from participants array
          displayAvatar = conversation.participants.find(p => p) || conversation.participants[0];
          displayName = displayAvatar?.name;
        }
        
        // Handle AI assistant display name
        if (!isGroupChat) {
          const participant = displayAvatar || conversation.participant;
          if (participant) {
            const isAI = participant.email === 'assistant@demo.com' || 
                        (participant.isDemo && participant.email === 'assistant@demo.com');
            if (isAI) {
              displayName = 'NeuroBot AI';
            }
          }
          
          // Fallback if still no name
          if (!displayName) {
            displayName = participant?.email === 'assistant@demo.com' 
              ? 'NeuroBot AI' 
              : (participant?.email || 'Unknown User');
          }
        }
        // Determine if there are messages in this conversation
        const hasMessages = conversation.lastMessage && conversation.lastMessage.text;
        
        const senderName = conversation.lastMessage?.senderId?.email === 'assistant@demo.com'
          ? 'NeuroBot AI'
          : conversation.lastMessage?.senderId?.name || null;
        const isOwnMessage = conversation.lastMessage?.senderId?._id === conversation.participant?._id ||
                            conversation.lastMessage?.senderId?.id === conversation.participant?._id ||
                            conversation.lastMessage?.senderId?._id === conversation.participant?.id ||
                            conversation.lastMessage?.senderId?.id === conversation.participant?.id;

        return (
          <ChatItem
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
          >
            {isGroupChat && conversation.participants && conversation.participants.length > 1 ? (
              <GroupAvatarSmall>
                {conversation.participants.slice(0, 2).map((p, idx) => (
                  <UserAvatar key={p._id || p.id || idx} user={p} size={25} />
                ))}
              </GroupAvatarSmall>
            ) : (
              <UserAvatar user={displayAvatar} size={50} />
            )}
            <ChatItemContent>
              <ChatItemHeader>
                <ChatItemName>
                  {displayName}
                  {isGroupChat && (
                    <GroupBadge>Group</GroupBadge>
                  )}
                </ChatItemName>
                <ChatItemHeaderRight>
                  {(() => {
                    // Only show badge if unreadCount exists and is greater than 0
                    const unreadCount = conversation.unreadCount;
                    if (unreadCount && typeof unreadCount === 'number' && unreadCount > 0) {
                      return <UnreadBadge>{unreadCount}</UnreadBadge>;
                    }
                    // Also handle string "0" or other falsy values
                    if (unreadCount && Number(unreadCount) > 0) {
                      return <UnreadBadge>{Number(unreadCount)}</UnreadBadge>;
                    }
                    return null;
                  })()}
                  {conversation.lastMessageAt && (
                    <ChatItemTime>
                      {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                        addSuffix: true,
                      })}
                    </ChatItemTime>
                  )}
                </ChatItemHeaderRight>
              </ChatItemHeader>
              <ChatItemPreview>
                {hasMessages ? (
                  <>
                    <ChatItemText>
                      {isGroupChat && senderName
                        ? `${senderName}: `
                        : !isOwnMessage && !isGroupChat
                        ? 'You: '
                        : ''}
                      {conversation.lastMessage.text}
                    </ChatItemText>
                    {conversation.lastMessage.metadata?.isAIMessage && (
                      <AIBadge>AI</AIBadge>
                    )}
                  </>
                ) : (
                  <ChatItemEmpty>No messages yet</ChatItemEmpty>
                )}
              </ChatItemPreview>
            </ChatItemContent>
          </ChatItem>
        );
      })}
    </ChatListContainer>
  );
};

export default ChatList;

