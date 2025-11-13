import { useState, useRef, useEffect, useCallback, useMemo, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import styled from 'styled-components';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';

interface User {
  _id?: string;
  id?: string;
  name?: string;
}

interface Message {
  _id?: string;
  text: string;
  senderId?: User;
}

interface Attachment {
  url: string;
  type: string;
  name?: string;
}

interface MessageInputProps {
  onSendMessage: (message: string, replyToId?: string, attachments?: Attachment[]) => void;
  onTyping?: (isTyping: boolean) => void;
  onCancelReply?: () => void;
  placeholder?: string;
  participants?: User[];
  replyingTo?: Message | null;
}

const MessageInputContainer = styled.div`
  padding: 20px 0 26px;
  background: white;
  border-top: 1px solid #e5e7eb;
  .dark-mode & {
    background: transparent;
    border-top-color: rgba(148, 163, 184, 0.15);
  }
  @media (max-width: 768px) {
    padding: 18px 0 22px;
  }
`;

const MessageInputForm = styled.form`
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
  background: #f5f5f5;
  border-radius: 36px;
  padding: 6px;
  gap: 6px;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.04);
  .dark-mode & {
    background: rgba(15, 23, 42, 0.85);
    box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.45);
  }
`;

const InputWrapper = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const MessageInputField = styled.input`
  width: 100%;
  padding: 18px 24px;
  border: none;
  border-radius: 30px;
  font-size: 1.05rem;
  outline: none;
  transition: box-shadow 0.2s;
  background: #ffffff;
  min-width: 0;
  min-height: 56px;
  line-height: 1.5;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
  &:focus {
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.15);
  }
  &::placeholder {
    color: #94a3b8;
  }
  .dark-mode & {
    background: rgba(15, 23, 42, 0.95);
    color: #e2e8f0;
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15);
    &:focus {
      box-shadow: inset 0 0 0 2px rgba(129, 140, 248, 0.18);
    }
    &::placeholder {
      color: #9ca3af;
    }
  }
  @media (max-width: 768px) {
    padding: 18px 18px;
    min-height: 52px;
    font-size: 1rem;
  }
`;

const SendButton = styled.button`
  padding: 0 28px;
  background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #38bdf8 100%);
  color: white;
  border: none;
  border-radius: 28px;
  font-size: 1.02rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  white-space: nowrap;
  box-shadow: 0 18px 32px rgba(76, 29, 149, 0.24);
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover:not(:disabled) {
    opacity: 0.96;
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(79, 70, 229, 0.28);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
  @media (max-width: 768px) {
    padding: 0 22px;
    font-size: 0.98rem;
    min-height: 52px;
  }
`;

const MentionsList = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 8px;
  z-index: 100;
  .dark-mode & {
    background: #2a2a2a;
    border-color: #3a3a3a;
  }
`;

const MentionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #f3f4f6;
  }
  .dark-mode &:hover {
    background: #3a3a3a;
  }
`;

const MentionItemAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
`;

const MentionItemName = styled.div`
  font-weight: 500;
  color: #111827;
  .dark-mode & {
    color: #e5e5e5;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  color: #64748b;
  font-size: 1.4rem;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
  
  .dark-mode & {
    color: #94a3b8;
    &:hover {
      background: rgba(129, 140, 248, 0.15);
      color: #818cf8;
    }
  }
`;

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  z-index: 1000;
  
  .EmojiPickerReact {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border-radius: 12px;
  }
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  flex-wrap: wrap;
`;

const ImagePreview = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  
  .dark-mode & {
    border-color: rgba(148, 163, 184, 0.3);
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

// Note: ReplyPreview components are defined in ChatWindow.tsx to avoid duplication
// These styled components are kept for potential future use or if MessageInput needs to be standalone

const MessageInput = ({ onSendMessage, onTyping, onCancelReply, placeholder, participants = [], replyingTo = null }: MessageInputProps) => {
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionsListRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const cursorPosition = inputRef.current?.selectionStart || message.length;
    const textBefore = message.substring(0, cursorPosition);
    const textAfter = message.substring(cursorPosition);
    setMessage(textBefore + emojiData.emoji + textAfter);
    setShowEmojiPicker(false);
    
    // Focus back on input and set cursor position
    setTimeout(() => {
      inputRef.current?.focus();
      const newPosition = cursorPosition + emojiData.emoji.length;
      inputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      let uploadUrl = apiUrl;
      if (!uploadUrl.endsWith('/api')) {
        uploadUrl = uploadUrl.endsWith('/') ? `${uploadUrl}api` : `${uploadUrl}/api`;
      }

      const response = await fetch(`${uploadUrl}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (data.success) {
        setAttachments(prev => [...prev, {
          url: data.data.url,
          type: 'image',
          name: data.data.originalName,
        }]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch && participants.length > 0) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(cursorPosition - mentionMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionQuery('');
      setMentionIndex(-1);
    }

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 1000);
  }, [participants.length, isTyping, onTyping]);

  const handleMentionSelect = useCallback((user: User) => {
    if (mentionIndex === -1) return;
    
    setMessage((prevMessage) => {
      const beforeMention = prevMessage.substring(0, mentionIndex);
      const afterMention = prevMessage.substring(mentionIndex + mentionQuery.length + 1);
      const newMessage = `${beforeMention}@${user.name} ${afterMention}`;
      
      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = mentionIndex + (user.name?.length || 0) + 2;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      
      return newMessage;
    });
    
    setShowMentions(false);
    setMentionQuery('');
    setMentionIndex(-1);
  }, [mentionIndex, mentionQuery]);

  const filteredParticipants = useMemo(() => 
    participants.filter(p => 
      p.name?.toLowerCase().includes(mentionQuery.toLowerCase()) &&
      p.name?.toLowerCase() !== mentionQuery.toLowerCase()
    ),
    [participants, mentionQuery]
  );

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submission
    if (isSubmittingRef.current) {
      return;
    }
    
    // Check if we have content to send
    const hasText = message.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    const hasContent = hasText || hasAttachments;
    
    if (!hasContent) {
      console.warn('No content to send');
      return;
    }
    
    console.log('Submitting message:', {
      text: message,
      textLength: message.length,
      attachmentsCount: attachments.length,
      attachments: attachments,
    });
    
    isSubmittingRef.current = true;
    onSendMessage(message, replyingTo?._id, hasAttachments ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    setIsTyping(false);
    setShowMentions(false);
    onTyping?.(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset submission flag after a short delay
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 100);
  }, [message, attachments, onSendMessage, replyingTo, onTyping]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // Handle arrow key navigation in mentions list
    if (showMentions && filteredParticipants.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // TODO: Implement arrow key navigation for mentions
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionQuery('');
        setMentionIndex(-1);
        return;
      }
    }
    
    // Handle Enter key to submit - prevent form submission and handle directly
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent double submission
      if (isSubmittingRef.current) {
        return;
      }
      
      // Directly handle submission without triggering form submit
      if (message.trim() || attachments.length > 0) {
        isSubmittingRef.current = true;
        onSendMessage(message, replyingTo?._id, attachments.length > 0 ? attachments : undefined);
        setMessage('');
        setAttachments([]);
        setIsTyping(false);
        setShowMentions(false);
        onTyping?.(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Reset submission flag after a short delay
        setTimeout(() => {
          isSubmittingRef.current = false;
        }, 100);
      }
    }
  }, [showMentions, filteredParticipants.length, message, attachments, onSendMessage, replyingTo, onTyping]);

  return (
    <MessageInputContainer>
      {/* Note: ReplyPreview is shown in ChatWindow above MessageInput to avoid duplication */}
      {attachments.length > 0 && (
        <ImagePreviewContainer>
          {attachments.map((attachment, index) => (
            <ImagePreview key={index}>
              <PreviewImage src={attachment.url} alt={attachment.name || 'Preview'} />
              <RemoveImageButton
                onClick={() => removeAttachment(index)}
                aria-label="Remove image"
              >
                ×
              </RemoveImageButton>
            </ImagePreview>
          ))}
        </ImagePreviewContainer>
      )}
      <MessageInputForm onSubmit={handleSubmit} role="form" aria-label="Message input">
        <ActionButtons>
          <IconButton
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Add emoji"
          >
            😊
          </IconButton>
          <IconButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Upload image"
          >
            📷
          </IconButton>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </ActionButtons>
        <InputWrapper>
          {showEmojiPicker && (
            <EmojiPickerContainer ref={emojiPickerRef}>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="auto"
                width={350}
                height={400}
              />
            </EmojiPickerContainer>
          )}
          <MessageInputField
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message...'}
            aria-label="Message input"
            aria-describedby={replyingTo ? 'reply-preview' : undefined}
            aria-expanded={showMentions}
            aria-autocomplete="list"
            aria-controls={showMentions ? 'mentions-list' : undefined}
          />
          {showMentions && filteredParticipants.length > 0 && (
            <MentionsList 
              ref={mentionsListRef}
              id="mentions-list"
              role="listbox"
              aria-label="Mention suggestions"
            >
              {filteredParticipants.map((user, index) => (
                <MentionItem
                  key={user._id || user.id}
                  onClick={() => handleMentionSelect(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMentionSelect(user);
                    }
                  }}
                  role="option"
                  tabIndex={0}
                  aria-label={`Mention ${user.name}`}
                >
                  <MentionItemAvatar aria-hidden="true">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </MentionItemAvatar>
                  <MentionItemName>{user.name}</MentionItemName>
                </MentionItem>
              ))}
            </MentionsList>
          )}
        </InputWrapper>
        <SendButton
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || uploading}
          aria-label="Send message"
          aria-disabled={(!message.trim() && attachments.length === 0) || uploading}
        >
          {uploading ? 'Uploading...' : 'Send'}
        </SendButton>
      </MessageInputForm>
    </MessageInputContainer>
  );
};

export default MessageInput;

