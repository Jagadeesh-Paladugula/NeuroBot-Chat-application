import styled, { keyframes } from 'styled-components';

export const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const MessageBubbleContainer = styled.div<{ $isOwn?: boolean; $isSummary?: boolean }>`
  display: flex;
  gap: 10px;
  max-width: ${props => props.$isSummary ? '100%' : '70%'};
  animation: ${slideIn} 0.2s ease-out;
  ${props => props.$isSummary && `
    align-self: stretch;
    justify-content: center;
    margin: 18px 0;
    padding: 0 8px;
  `}
  ${props => props.$isOwn && !props.$isSummary && `
    align-self: flex-end;
    flex-direction: row-reverse;
    margin-right: 8px;
  `}
  ${props => !props.$isOwn && !props.$isSummary && `
    align-self: flex-start;
    margin-left: 8px;
  `}

  @media (max-width: 768px) {
    max-width: ${props => props.$isSummary ? '100%' : '85%'};
  }
`;

export const MessageAvatar = styled.div`
  flex-shrink: 0;
`;

export const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const MessageSender = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const AILabel = styled.span`
  background: #6366f1;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
`;

export const MessageText = styled.div<{ $isOwn?: boolean; $isAIMessage?: boolean }>`
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
  line-height: 1.4;
  ${props => props.$isOwn && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
  `}
  ${props => !props.$isOwn && `
    background: white;
    color: #111827;
    border: 1px solid #e5e7eb;
    border-bottom-left-radius: 4px;
    .dark-mode & {
      background: #2a2a2a;
      color: #e5e5e5;
      border-color: #3a3a3a;
    }
  `}
  ${props => props.$isAIMessage && `
    background: #f0f9ff;
    border-color: #6366f1;
    border-left: 3px solid #6366f1;
  `}
`;

export const MessageFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #6b7280;
  padding: 0 4px;
`;

export const MessageStatus = styled.span<{ $status?: string }>`
  color: ${props => props.$status === 'seen' ? '#10b981' : '#9ca3af'};
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
`;

export const MessageReplyPreview = styled.div`
  padding: 8px 12px;
  margin-bottom: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.85rem;
  .dark-mode & {
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const MessageReplySender = styled.div`
  font-weight: 600;
  color: #667eea;
  margin-bottom: 2px;
`;

export const MessageReplyText = styled.div`
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  .dark-mode & {
    color: #9ca3af;
  }
`;

export const Mention = styled.span`
  color: #667eea;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  .dark-mode & {
    background: rgba(102, 126, 234, 0.2);
  }
`;

export const MessageReplyBtn = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 0.9rem;
  border-radius: 4px;
  transition: background 0.2s;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .dark-mode & {
    color: #9ca3af;
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

// Chat Summary Styles
export const ChatSummaryCard = styled.div`
  width: 100%;
  margin: 0 auto;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.18));
  border: 1px solid rgba(99, 102, 241, 0.22);
  border-radius: 18px;
  padding: 20px 24px;
  color: #1e3a8a;
  box-shadow: 0 24px 40px rgba(59, 130, 246, 0.18);
  position: relative;
  overflow: hidden;
  max-width: 640px;
  &::before {
    content: '';
    position: absolute;
    inset: -40% 10% 40% -10%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 70%);
    transform: rotate(12deg);
    animation: summaryGlow 6s ease-in-out infinite;
    pointer-events: none;
  }
  .dark-mode & {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(30, 64, 175, 0.32));
    border-color: rgba(99, 102, 241, 0.28);
    color: #dbeafe;
    box-shadow: 0 26px 44px rgba(30, 64, 175, 0.32);
    &::before {
      background: radial-gradient(circle, rgba(226, 232, 240, 0.25), transparent 70%);
    }
  }
`;

export const ChatSummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  position: relative;
`;

export const ChatSummaryTitle = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: inherit;
`;

export const ChatSummaryMeta = styled.div`
  font-size: 0.75rem;
  margin-top: 4px;
  color: rgba(17, 24, 39, 0.6);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &::before {
    content: '✦';
    font-size: 0.7rem;
  }
  .dark-mode & {
    color: rgba(226, 232, 240, 0.6);
  }
`;

export const ChatSummaryRequested = styled.div`
  font-size: 0.75rem;
  color: rgba(30, 64, 175, 0.8);
  margin-top: 4px;
  .dark-mode & {
    color: rgba(191, 219, 254, 0.85);
  }
`;

export const ChatSummaryBody = styled.div`
  margin-top: 12px;
  font-size: 0.92rem;
  line-height: 1.6;
  color: inherit;
`;

export const ChatSummaryText = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ChatSummaryLine = styled.span<{ $isSpacer?: boolean }>`
  display: block;
  color: inherit;
  ${props => props.$isSpacer && `
    min-height: 6px;
  `}
`;

export const ChatSummaryBullet = styled.span`
  margin-right: 8px;
  color: rgba(37, 99, 235, 0.8);
  font-weight: 600;
  .dark-mode & {
    color: rgba(191, 219, 254, 0.82);
  }
`;

export const ChatSummaryUsername = styled.span`
  font-family: 'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1d4ed8;
  font-weight: 700;
  letter-spacing: 0.02em;
  .dark-mode & {
    color: #c7d2fe;
  }
`;

export const ChatSummaryTextRest = styled.span`
  margin-left: 4px;
  color: rgba(17, 24, 39, 0.78);
  .dark-mode & {
    color: rgba(226, 232, 240, 0.85);
  }
`;

export const ChatSummaryHighlight = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  margin: 0 1px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.18);
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.18);
  &::before {
    content: '◎';
    font-size: 0.65rem;
    margin-right: 4px;
    color: rgba(37, 99, 235, 0.9);
  }
  .dark-mode & {
    background: rgba(147, 197, 253, 0.22);
    color: #f8fafc;
    box-shadow: 0 10px 20px rgba(30, 64, 175, 0.32);
    &::before {
      color: rgba(191, 219, 254, 0.9);
    }
  }
`;

export const MessageAttachments = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
`;

export const MessageImage = styled.img`
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
  cursor: pointer;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .dark-mode & {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
  }
`;

