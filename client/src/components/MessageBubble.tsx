import { format } from 'date-fns';
import { useMemo, useCallback, memo, ReactNode } from 'react';
import UserAvatar from './UserAvatar';
import {
  MessageBubbleContainer,
  MessageAvatar,
  MessageContent,
  MessageSender,
  AILabel,
  MessageText,
  MessageFooter,
  MessageStatus,
  MessageReplyPreview,
  MessageReplySender,
  MessageReplyText,
  Mention,
  MessageReplyBtn,
  ChatSummaryCard,
  ChatSummaryHeader,
  ChatSummaryTitle,
  ChatSummaryMeta,
  ChatSummaryRequested,
  ChatSummaryBody,
  ChatSummaryText,
  ChatSummaryLine,
  ChatSummaryBullet,
  ChatSummaryUsername,
  ChatSummaryTextRest,
  ChatSummaryHighlight,
  MessageAttachments,
  MessageImage,
} from './MessageBubble.styles';

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

interface Attachment {
  url: string;
  type: string;
  name?: string;
}

interface Message {
  _id?: string;
  text: string;
  senderId?: User;
  createdAt: string | Date;
  status?: 'sent' | 'delivered' | 'seen';
  attachments?: Attachment[];
  parentMessageId?: {
    senderId?: User;
    text: string;
  };
  mentions?: Array<{ name: string; _id?: string; id?: string }>;
  metadata?: {
    isAISummary?: boolean;
    isAIMessage?: boolean;
    summaryInfo?: {
      requestedBy?: string;
      requestedByName?: string;
      messageCount?: number;
      requestedAt?: string | Date;
    };
  };
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: (message: Message) => void;
  showReplyButton?: boolean;
  currentUserId?: string;
  namesToHighlight?: string[];
}

const escapeRegExp = (value = ''): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MessageBubble = memo(({
  message,
  isOwn,
  onReply,
  showReplyButton = false,
  currentUserId,
  namesToHighlight = [],
}: MessageBubbleProps) => {
  const sender = message.senderId;
  const isAISummary = message.metadata?.isAISummary;
  const summaryInfo = message.metadata?.summaryInfo || {};
  const isAIMessage =
    message.metadata?.isAIMessage || sender?.email === 'assistant@demo.com';
  const parentMessage = message.parentMessageId;
  const mentions = message.mentions || [];
  const displaySenderName = isAIMessage
    ? 'NeuroBot AI'
    : sender?.name;

  const highlightPattern = useMemo(() => {
    if (!Array.isArray(namesToHighlight)) return '';

    const normalizedNames = Array.from(
      new Set(
        namesToHighlight
          .map((name) => (typeof name === 'string' ? name.trim() : ''))
          .filter(Boolean)
      )
    )
      .map((name) => name.replace(/\u2019/g, '\''))
      .sort((a, b) => b.length - a.length);

    if (!normalizedNames.length) {
      return '';
    }

    const patternBody = normalizedNames
      .map((name) => {
        const escaped = escapeRegExp(name).replace(/\\'/g, "['']");
        const hasPossessive = /['']s$/i.test(name);
        return hasPossessive ? escaped : `${escaped}(?:['']s)?`;
      })
      .join('|');

    return patternBody ? `(^|\\b)(${patternBody})(?=$|\\b)` : '';
  }, [namesToHighlight]);

  const renderWithHighlights = useCallback((text: string): ReactNode => {
    if (!text || !highlightPattern) return text;

    const regex = new RegExp(highlightPattern, 'gi');
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let iteration = 0;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index + match[1].length;
      const matchedText = match[2];

      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex));
      }

      parts.push(
        <ChatSummaryHighlight
          key={`summary-highlight-${matchIndex}-${iteration}`}
        >
          {matchedText}
        </ChatSummaryHighlight>
      );

      lastIndex = matchIndex + matchedText.length;
      iteration += 1;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length ? parts : text;
  }, [highlightPattern]);

  const renderSummaryLines = useCallback((summaryText: string): ReactNode => {
    if (!summaryText) {
      return null;
    }

    const lines = summaryText.split('\n');

    return lines.map((line, index) => {
      const originalLine = line;
      const trimmed = originalLine.trim();

      if (!trimmed) {
        return (
          <ChatSummaryLine key={`summary-line-${index}`} $isSpacer>
            &nbsp;
          </ChatSummaryLine>
        );
      }

      let bullet = '';
      let rest = trimmed;
      const bulletMatch = rest.match(/^([•*\-\u2022>])\s*(.+)$/);
      if (bulletMatch) {
        bullet = bulletMatch[1];
        rest = bulletMatch[2].trim();
      }

      const colonMatch = rest.match(
        /^([A-Z][A-Za-z0-9&'']{1,40})\s*:\s*(.*)$/
      );

      if (colonMatch) {
        const [, namePart, remainder] = colonMatch;
        const cleanedName = namePart.trim();
        const cleanedRemainder = remainder?.trim();
        const highlightedRemainder = renderWithHighlights(cleanedRemainder || '');

        return (
          <ChatSummaryLine key={`summary-line-${index}`}>
            {bullet && <ChatSummaryBullet>{bullet}</ChatSummaryBullet>}
            <ChatSummaryUsername>{cleanedName}</ChatSummaryUsername>
            {cleanedRemainder ? (
              <ChatSummaryTextRest>
                :{' '}
                {highlightedRemainder}
              </ChatSummaryTextRest>
            ) : (
              <ChatSummaryTextRest>:</ChatSummaryTextRest>
            )}
          </ChatSummaryLine>
        );
      }

      const highlightedLine = renderWithHighlights(rest);

      return (
        <ChatSummaryLine key={`summary-line-${index}`}>
          {bullet && <ChatSummaryBullet>{bullet}</ChatSummaryBullet>}
          {highlightedLine}
        </ChatSummaryLine>
      );
    });
  }, [renderWithHighlights]);

  if (isAISummary) {
    const requestedBy = summaryInfo.requestedBy;
    const requestedByName = summaryInfo.requestedByName;
    const requestedByStr = requestedBy?.toString?.() ?? requestedBy;
    const currentUserIdStr = currentUserId?.toString?.() ?? currentUserId;
    const requestedLabel = requestedByStr && currentUserIdStr && requestedByStr === currentUserIdStr
      ? 'You'
      : requestedByName || (requestedByStr ? 'Someone' : '');
    const messageCount = summaryInfo.messageCount;
    const generatedAt = message.createdAt || summaryInfo.requestedAt;
    const formattedSummaryContent = renderSummaryLines(message.text);

    return (
      <MessageBubbleContainer $isSummary>
        <ChatSummaryCard>
          <ChatSummaryHeader>
            <div>
              <ChatSummaryTitle>AI Summary</ChatSummaryTitle>
              {(messageCount || generatedAt) && (
                <ChatSummaryMeta>
                  {messageCount
                    ? `Based on ${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`
                    : 'Summary updated'}
                  {generatedAt
                    ? ` · ${new Date(generatedAt).toLocaleTimeString()}`
                    : ''}
                </ChatSummaryMeta>
              )}
              {requestedLabel && (
                <ChatSummaryRequested>
                  Requested by{' '}
                  <ChatSummaryUsername>{requestedLabel}</ChatSummaryUsername>
                </ChatSummaryRequested>
              )}
            </div>
          </ChatSummaryHeader>
          <ChatSummaryBody>
            <ChatSummaryText>
              {formattedSummaryContent || renderWithHighlights(message.text)}
            </ChatSummaryText>
          </ChatSummaryBody>
        </ChatSummaryCard>
      </MessageBubbleContainer>
    );
  }

  // Highlight mentions in text
  const renderTextWithMentions = useCallback((text: string): ReactNode => {
    if (!text || !mentions.length) return text;
    
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const mentionPattern = /@(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = mentionPattern.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Check if this mention matches a user
      const mentionedUser = mentions.find(m => m.name === match![1]);
      if (mentionedUser) {
        parts.push(
          <Mention key={match.index}>
            @{match[1]}
          </Mention>
        );
      } else {
        parts.push(match[0]);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  }, [mentions]);

  return (
    <MessageBubbleContainer $isOwn={isOwn}>
      {!isOwn && (
        <MessageAvatar>
          <UserAvatar user={sender} size={35} />
        </MessageAvatar>
      )}
      <MessageContent>
        {!isOwn && (
          <MessageSender>
            {displaySenderName}
            {isAIMessage && <AILabel>NeuroBot</AILabel>}
          </MessageSender>
        )}
        {parentMessage && (
          <MessageReplyPreview>
            <MessageReplySender>
              {parentMessage.senderId?.name || 'Unknown'}
            </MessageReplySender>
            <MessageReplyText>{parentMessage.text}</MessageReplyText>
          </MessageReplyPreview>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments>
            {message.attachments.map((attachment, index) => (
              attachment.type === 'image' ? (
                <MessageImage
                  key={index}
                  src={attachment.url}
                  alt={attachment.name || 'Image attachment'}
                  onClick={() => window.open(attachment.url, '_blank')}
                />
              ) : null
            ))}
          </MessageAttachments>
        )}
        {message.text && (
          <MessageText $isOwn={isOwn} $isAIMessage={isAIMessage}>
            {renderTextWithMentions(message.text)}
          </MessageText>
        )}
        <MessageFooter>
          <span>
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOwn && (
            <MessageStatus $status={message.status || 'sent'}>
              {message.status === 'seen' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </MessageStatus>
          )}
          {showReplyButton && onReply && (
            <MessageReplyBtn
              onClick={() => onReply(message)}
              title="Reply"
            >
              ↪
            </MessageReplyBtn>
          )}
        </MessageFooter>
      </MessageContent>
    </MessageBubbleContainer>
  );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;

