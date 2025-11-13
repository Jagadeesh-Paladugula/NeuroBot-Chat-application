import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { requestNotificationPermission, showMessageNotification, isCurrentConversation } from '../utils/notifications';
import api, { updateProfile as updateProfileAPI, deleteAccount as deleteAccountAPI } from '../api/api';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import GroupMembers from './GroupMembers';
import UserAvatar from '../components/UserAvatar';
import ChatList from '../components/ChatList';
import UserList from './UserList';
import GroupCreator from './GroupCreator';
import UsersSidebar from './UsersSidebar';
import MainSidebar from '../components/MainSidebar';
import SettingsPanel from '../components/SettingsPanel';
import Loader from '../components/Loader';
import {
  enrichConversationSummaries,
  mergeSummaries,
  normalizeSummaryCollection,
  normalizeSummaryRecord,
  NormalizedSummary,
} from '../utils/summaries';
import { Message, Conversation, User } from '../types';


const summarySparkle = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

const summaryGlow = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
`;

const summaryBtnPulse = keyframes`
  0%, 100% {
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.2);
  }
  50% {
    box-shadow: 0 12px 26px rgba(37, 99, 235, 0.28);
  }
`;

const summaryBtnShimmer = keyframes`
  0% {
    transform: translateX(-160%) skewX(-20deg);
    opacity: 0;
  }
  45% {
    transform: translateX(110%) skewX(-20deg);
    opacity: 1;
  }
  100% {
    transform: translateX(160%) skewX(-20deg);
    opacity: 0;
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

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

const ChatWindowContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);

  .dark-mode & {
    background: rgba(17, 24, 39, 0.88);
  }
`;

const ChatWindowContent = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  padding: 0 28px;
  overflow: hidden;

  .dark-mode & {
    padding: 0 28px;
  }

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const ChatWindowLoader = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 40px 20px;
  color: #6b7280;

  .dark-mode & {
    color: #cbd5f5;
  }
`;

const BackToChatsButton = styled.button`
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 12px 28px rgba(79, 70, 229, 0.2);

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 16px 32px rgba(79, 70, 229, 0.28);
  }

  .dark-mode & {
    box-shadow: 0 12px 28px rgba(129, 140, 248, 0.25);

    &:hover {
      box-shadow: 0 16px 32px rgba(99, 102, 241, 0.32);
    }
  }
`;

const ChatHeader = styled.div`
  padding: 20px 0 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  gap: 15px;
  background: transparent;
  z-index: 10;

  .dark-mode & {
    background: transparent;
    border-bottom-color: rgba(148, 163, 184, 0.12);
  }

  @media (max-width: 768px) {
    padding: 12px 18px;
  }
`;

const BackButton = styled.button`
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  color: #667eea;
  cursor: pointer;
  padding: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  transition: all 0.2s ease;
  position: relative;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-left: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform 0.2s ease;
  }

  &:hover:not(:disabled) {
    background: rgba(102, 126, 234, 0.15);
    border-color: rgba(102, 126, 234, 0.3);
    transform: translateX(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    
    &::before {
      transform: rotate(45deg) translateX(-1px);
    }
  }

  &:active:not(:disabled) {
    transform: translateX(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dark-mode & {
    background: rgba(129, 140, 248, 0.15);
    border-color: rgba(129, 140, 248, 0.25);
    color: #818cf8;

    &:hover:not(:disabled) {
      background: rgba(129, 140, 248, 0.2);
      border-color: rgba(129, 140, 248, 0.35);
      box-shadow: 0 4px 12px rgba(129, 140, 248, 0.25);
    }
  }
`;

const ChatHeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const GroupAvatar = styled.div`
  display: flex;
  gap: -10px;
  position: relative;

  > * {
    margin-left: -8px;
  }

  > *:first-child {
    margin-left: 0;
  }
`;

const ChatHeaderName = styled.div<{ $clickable?: boolean }>`
  font-weight: 600;
  color: #0f172a;
  font-size: 1.02rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: ${props => props.$clickable ? 'opacity 0.2s' : 'none'};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    ${props => props.$clickable && 'opacity: 0.8;'}
  }

  .dark-mode & {
    color: #e2e8f0;
  }
`;

const GroupInfoIcon = styled.span`
  font-size: 0.85rem;
  opacity: 0.6;
`;

const ChatHeaderStatus = styled.div`
  font-size: 0.85rem;
  margin-top: 2px;
  color: #64748b;
`;

const ChatHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .dark-mode & {
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

const SummaryButton = styled(IconButton)`
  font-size: 0.95rem;
  font-weight: 600;
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.25);
  border-radius: 10px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(129, 140, 248, 0.25));
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.2);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: ${summaryBtnPulse} 5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -160%;
    height: 100%;
    width: 160%;
    background: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0)
    );
    transform: skewX(-20deg);
    animation: ${summaryBtnShimmer} 3.6s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(37, 99, 235, 0.25);
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(129, 140, 248, 0.32));
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: rgba(37, 99, 235, 0.12);
  }

  .dark-mode & {
    color: #f8fafc;
    border-color: rgba(147, 197, 253, 0.3);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(67, 56, 202, 0.4));
    box-shadow: 0 16px 32px rgba(37, 99, 235, 0.28);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.32), rgba(67, 56, 202, 0.45));
    }

    &:disabled {
      background: rgba(59, 130, 246, 0.18);
    }
  }
`;

const Sparkle = styled.span`
  font-size: 0.95rem;
  animation: ${summarySparkle} 1.6s ease-in-out infinite;
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  animation: ${spin} 1s linear infinite;
`;

const DeleteButton = styled(IconButton)`
  font-size: 0.9rem;
  font-weight: 600;
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  background: rgba(254, 226, 226, 0.6);
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
  justify-content: center;

  &::before {
    content: '';
    width: 14px;
    height: 14px;
    position: relative;
    display: inline-block;
    background: currentColor;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 6h18'/%3E%3Cpath d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/%3E%3Cpath d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/%3E%3Cline x1='10' y1='11' x2='10' y2='17'/%3E%3Cline x1='14' y1='11' x2='14' y2='17'/%3E%3C/svg%3E");
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    transition: transform 0.2s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: rgba(254, 202, 202, 0.8);
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
    color: #b91c1c;
    
    &::before {
      transform: scale(1.1);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .dark-mode & {
    color: #fca5a5;
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(185, 28, 28, 0.25);

    &:hover:not(:disabled) {
      background: rgba(220, 38, 38, 0.35);
      border-color: rgba(248, 113, 113, 0.5);
      box-shadow: 0 6px 16px rgba(248, 113, 113, 0.4);
      color: #fca5a5;
    }

    &:disabled {
      background: rgba(185, 28, 28, 0.2);
      box-shadow: none;
    }
  }
`;

const ReplyPreview = styled.div`
  padding: 12px 0;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;

  .dark-mode & {
    background: #2a2a2a;
    border-bottom-color: #3a3a3a;
  }
`;

const ReplyPreviewContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ReplyPreviewSender = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #667eea;
`;

const ReplyPreviewText = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .dark-mode & {
    color: #9ca3af;
  }
`;

const ReplyPreviewClose = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const ChatMessages = styled.div<{ $isLoading?: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px 34px;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: ${props => props.$isLoading ? 'center' : 'flex-start'};
  align-items: ${props => props.$isLoading ? 'center' : 'stretch'};

  .dark-mode & {
    background: #0f172a;
  }

  @media (max-width: 768px) {
    padding: 15px 0 20px;
  }
`;

const ChatSummaryCard = styled.div<{ $pending?: boolean; $error?: boolean; $inline?: boolean }>`
  margin: ${props => props.$inline ? '12px auto 0' : '0 auto'};
  background: ${props => props.$error 
    ? '#fee2e2'
    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.18))'};
  border: 1px solid ${props => props.$error 
    ? '#fecaca'
    : 'rgba(99, 102, 241, 0.22)'};
  border-radius: 18px;
  padding: 20px 24px;
  color: ${props => props.$error ? '#991b1b' : '#1e3a8a'};
  box-shadow: ${props => props.$error 
    ? 'none'
    : '0 24px 40px rgba(59, 130, 246, 0.18)'};
  position: relative;
  overflow: hidden;
  max-width: 640px;
  opacity: ${props => props.$pending ? 0.9 : 1};

  &::before {
    content: '';
    position: absolute;
    inset: -40% 10% 40% -10%;
    background: ${props => props.$error
      ? 'radial-gradient(circle, rgba(254, 226, 226, 0.45), transparent 70%)'
      : 'radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 70%)'};
    transform: rotate(12deg);
    animation: ${summaryGlow} 6s ease-in-out infinite;
    pointer-events: none;
  }

  .dark-mode & {
    background: ${props => props.$error
      ? 'rgba(248, 113, 113, 0.12)'
      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(30, 64, 175, 0.32))'};
    border-color: ${props => props.$error
      ? 'rgba(248, 113, 113, 0.3)'
      : 'rgba(99, 102, 241, 0.28)'};
    color: ${props => props.$error ? '#fecaca' : '#dbeafe'};
    box-shadow: ${props => props.$error
      ? 'none'
      : '0 26px 44px rgba(30, 64, 175, 0.32)'};

    &::before {
      background: ${props => props.$error
        ? 'radial-gradient(circle, rgba(248, 113, 113, 0.28), transparent 70%)'
        : 'radial-gradient(circle, rgba(226, 232, 240, 0.25), transparent 70%)'};
    }
  }
`;

const ChatSummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  position: relative;
`;

const ChatSummaryTitle = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: inherit;
`;

const ChatSummaryBody = styled.div`
  margin-top: 12px;
  font-size: 0.92rem;
  line-height: 1.6;
  color: inherit;
`;

const ChatSummaryLoading = styled.div`
  font-style: italic;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '⟳';
    font-size: 0.85rem;
    animation: ${summarySparkle} 1.2s linear infinite;
  }
`;

const ChatSummaryErrorText = styled.div`
  margin-top: 8px;
  color: #b91c1c;
  font-weight: 600;

  .dark-mode & {
    color: #fca5a5;
  }
`;

const buildSummaryMessagePayload = (
  summaryRecord: NormalizedSummary | null | undefined,
  conversationId: string | undefined
): Message | null => {
  if (!summaryRecord || !summaryRecord.text) {
    return null;
  }

  const messageId =
    summaryRecord.summaryMessageId || summaryRecord._id || `summary-${Date.now()}`;

  return {
    _id: messageId,
    id: messageId,
    conversationId,
    text: summaryRecord.text,
    senderId: {
      _id: 'assistant-bot-id',
      id: 'assistant-bot-id',
      name: 'NeuroBot AI',
      email: 'assistant@demo.com',
      avatarUrl: null,
    },
    metadata: {
      isAIMessage: true,
      isAISummary: true,
      summaryInfo: {
        _id: summaryRecord._id,
        summaryId: summaryRecord._id,
        requestedBy: summaryRecord.requestedBy,
        requestedByName: summaryRecord.requestedByName,
        requestedAt: summaryRecord.requestedAt,
        rangeStart: summaryRecord.rangeStart,
        rangeEnd: summaryRecord.rangeEnd,
        messageCount: summaryRecord.messageCount,
      },
    },
    createdAt: summaryRecord.generatedAt || new Date().toISOString(),
    updatedAt: summaryRecord.generatedAt || new Date().toISOString(),
  };
};

const ChatWindow = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, logout, fetchUser } = useAuth();
  const { socket, emitMessageSeen } = useSocket();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [, setSummaries] = useState<NormalizedSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [activeSection, setActiveSection] = useState<'messages' | 'groups'>('messages');
  const [showSettings, setShowSettings] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(user?.readReceiptsEnabled ?? true);
  const [updatingReadReceipts, setUpdatingReadReceipts] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const summaryPendingRef = useRef(false);

  const scrollToBottom = useCallback((instant = false) => {
    if (instant) {
      // Instant scroll for initial load
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      // Also scroll the container directly as a fallback
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      // Smooth scroll for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const clearPendingSummary = useCallback(() => {
    if (summaryPendingRef.current) {
      summaryPendingRef.current = false;
      setIsSummarizing(false);
    }
  }, []);

  const upsertSummaryRecord = useCallback(
    (record: NormalizedSummary | null) => {
      if (!record) {
        return;
      }

      setSummaries((prev) => mergeSummaries(prev, [record]));

      setConversation((prev) => {
        if (!prev) return prev;
        const updatedSummaries = mergeSummaries(prev.aiSummaries, [record]);
        return {
          ...prev,
          aiSummaries: updatedSummaries,
          aiSummary:
            updatedSummaries.length > 0
              ? updatedSummaries[updatedSummaries.length - 1]
              : null,
        };
      });

      setConversations((prev) =>
        (Array.isArray(prev) ? prev : []).map((conv) => {
          if (conv.id === conversationId) {
            const updatedSummaries = mergeSummaries(conv.aiSummaries, [record]);
            return {
              ...conv,
              aiSummaries: updatedSummaries,
              aiSummary:
                updatedSummaries.length > 0
                  ? updatedSummaries[updatedSummaries.length - 1]
                  : null,
            };
          }
          return conv;
        })
      );
    },
    [conversationId]
  );

  // Move utility functions outside component to avoid recreation on every render
  const normalizeConversationId = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object') {
      if (value._id) return value._id.toString();
      if (value.id) return value.id.toString();
    }
    return value.toString?.() ?? '';
  }, []);

  const normalizeUserId = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object') {
      if (value._id) return value._id.toString();
      if (value.id) return value.id.toString();
    }
    return value.toString?.() ?? '';
  }, []);

  const assistantDisplayName = useMemo(() => 'NeuroBot AI', []);

  useEffect(() => {
    setReadReceiptsEnabled(user?.readReceiptsEnabled ?? true);
  }, [user?.readReceiptsEnabled]);

  const fetchConversations = useCallback(async () => {
    setListLoading(true);
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

      const matchingConversation = fetchedConversations.find(
        (c) => c.id === conversationId || c._id === conversationId
      );

      if (matchingConversation) {
        if (
          matchingConversation.type === 'one-to-one' &&
          !matchingConversation.participant &&
          matchingConversation.participants
        ) {
          const otherParticipant = matchingConversation.participants.find(
            (p) =>
              p &&
              p._id &&
              p._id.toString() !== user?.id?.toString()
          );
          if (otherParticipant) {
            matchingConversation.participant = otherParticipant;
          }
        }

        setConversation(matchingConversation);
        setSummaries(matchingConversation.aiSummaries || []);
        setSummaryError(null);
      } else {
        setSummaries([]);
        navigate('/chats');
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setSummaries([]);
      navigate('/chats');
    } finally {
      setListLoading(false);
    }
  }, [conversationId, navigate, user?.id]);

  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const response = await api.get<{ messages?: Message[]; summaries?: unknown; aiSummary?: unknown }>(
        `/conversations/${conversationId}/messages`
      );
      const fetchedMessages = Array.isArray(response.data?.messages)
        ? response.data.messages
        : [];
      setMessages(fetchedMessages);

      const normalizedSummaries = normalizeSummaryCollection(
        response.data?.summaries,
        response.data?.aiSummary
      );
      const latestSummary = normalizedSummaries.length
        ? normalizedSummaries[normalizedSummaries.length - 1]
        : null;

      setSummaries(normalizedSummaries);
      setSummaryError(null);

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              aiSummaries: normalizedSummaries,
              aiSummary: latestSummary,
            }
          : prev
      );

      setConversations((prev) =>
        (Array.isArray(prev) ? prev : []).map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                aiSummaries: normalizedSummaries,
                aiSummary: latestSummary,
              }
            : conv
        )
      );
      
      // Scroll to bottom after messages are loaded
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
      setSummaries([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [conversationId, scrollToBottom]);

  const handleConversationDeleted = useCallback(
    (payload: { conversationId?: unknown; deletedBy?: unknown } = {}) => {
      const deletedId = normalizeConversationId(payload.conversationId);
      if (!deletedId) {
        return;
      }

      setConversations((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (conv) => normalizeConversationId(conv.id || conv._id) !== deletedId
        )
      );

      if (normalizeConversationId(conversationId) === deletedId) {
        setMessages([]);
        setConversation(null);

        const deletedBy = normalizeUserId(payload.deletedBy);
        const currentUserId = normalizeUserId(user?.id || user?._id);
        if (deletedBy && currentUserId && deletedBy !== currentUserId) {
          alert('This conversation was deleted by another participant.');
        }

        navigate('/chats');
      }
    },
    [conversationId, navigate, user]
  );

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();

    if (!socket) return;

    const currentConversationId = normalizeConversationId(conversationId);

    const handleNewMessage = (data: { message: Message }) => {
      const { message } = data;
      const incomingConversationId = normalizeConversationId(
        message.conversationId
      );

      if (incomingConversationId === currentConversationId) {
        let appended = false;
        setMessages((prev) => {
          const previous = Array.isArray(prev) ? prev : [];
          const incomingId = message._id || message.id;
          const index = previous.findIndex((msg) => {
            const msgId = msg._id || msg.id;
            return msgId && incomingId && msgId.toString() === incomingId.toString();
          });

          if (index !== -1) {
            const updated = [...previous];
            updated[index] = { ...updated[index], ...message };
            return updated;
          }

          appended = true;
          return [...previous, message];
        });
        if (message.metadata?.isAISummary) {
          const summaryRecord = normalizeSummaryRecord(
            {
              _id:
                message.metadata?.summaryInfo?._id ||
                message.metadata?.summaryInfo?.summaryId ||
                message._id,
              text: message.text,
              messageCount: message.metadata?.summaryInfo?.messageCount,
              generatedAt: message.createdAt,
              requestedBy: message.metadata?.summaryInfo?.requestedBy,
              requestedByName: message.metadata?.summaryInfo?.requestedByName,
              lastMessageCreatedAt: message.metadata?.summaryInfo?.rangeEnd,
              summaryMessageId: message._id,
              rangeStart: message.metadata?.summaryInfo?.rangeStart,
              rangeEnd: message.metadata?.summaryInfo?.rangeEnd,
              requestedAt: message.metadata?.summaryInfo?.requestedAt,
            },
            'summary'
          );
          upsertSummaryRecord(summaryRecord);
          setSummaryError(null);
          clearPendingSummary();
        } else if (appended) {
          // Regular message appended while no summary pending
          if (!summaryPendingRef.current) {
            setIsSummarizing(false);
          }
        }
        scrollToBottom();

        // Mark message as delivered if it's not from current user
        const senderId = normalizeUserId(message.senderId?._id || message.senderId?.id || message.senderId);
        const currentUserId = normalizeUserId(user?.id || user?._id);
        const isFromCurrentUser = senderId === currentUserId;
        
        if (!isFromCurrentUser && socket) {
          socket.emit('messageDelivered', { messageId: message._id, conversationId });
        }

        const messageCreatedAt =
          (message.createdAt && new Date(message.createdAt).toISOString()) ||
          new Date().toISOString();
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: message,
                lastMessageAt: messageCreatedAt,
                unreadCount: 0,
              }
            : prev
        );
        setConversations((prev) =>
          (Array.isArray(prev) ? prev : []).map((conv) => {
            const convId = normalizeConversationId(conv.id || conv._id);
            if (convId === incomingConversationId) {
              return {
                ...conv,
                lastMessage: message,
                lastMessageAt: messageCreatedAt,
                unreadCount: 0,
              };
            }
            return conv;
          })
        );

        window.dispatchEvent(
          new CustomEvent('conversationUpdated', {
            detail: {
              conversationId: incomingConversationId,
              lastMessage: message,
              unreadCount: 0,
              lastMessageAt: messageCreatedAt,
            },
          })
        );
      } else {
        // Message is for a different conversation
        const senderId = normalizeUserId(message.senderId?._id || message.senderId?.id || message.senderId);
        const currentUserId = normalizeUserId(user?.id || user?._id);
        const isFromCurrentUser = senderId === currentUserId;
        
        const senderDisplayName =
          message.senderId?.email === 'assistant@demo.com'
            ? 'NeuroBot AI'
            : message.senderId?.name || 'Someone';
        
        // Only show notification if message is NOT from current user
        if (!isFromCurrentUser) {
          showMessageNotification(message, senderDisplayName);
        }
        
        const messageCreatedAt =
          (message.createdAt && new Date(message.createdAt).toISOString()) ||
          new Date().toISOString();
        
        setConversations((prev) => {
          const previous = Array.isArray(prev) ? [...prev] : [];
          let found = false;
          const updated = previous.map((conv) => {
            const convId = normalizeConversationId(conv.id || conv._id);
            if (convId === incomingConversationId) {
              found = true;
              // If message is from current user, set unreadCount to 0
              // If message is from another user, increment unreadCount
              const currentUnreadCount = conv.unreadCount || 0;
              const newUnreadCount = isFromCurrentUser ? 0 : currentUnreadCount + 1;
              return {
                ...conv,
                lastMessage: message,
                lastMessageAt: messageCreatedAt,
                unreadCount: newUnreadCount,
              };
            }
            return conv;
          });

          // Only add new conversation if message is NOT from current user
          if (!found && !isFromCurrentUser) {
            return [
              {
                id: incomingConversationId,
                type: message.conversationType || 'group',
                name: message.conversationName || message.senderId?.name || 'Group Chat',
                lastMessage: message,
                lastMessageAt: messageCreatedAt,
                unreadCount: 1,
                participants: [],
              },
              ...updated,
            ];
          }
          return updated;
        });
        
        // Only dispatch conversationUpdated with unreadIncrement if message is NOT from current user
        window.dispatchEvent(
          new CustomEvent('conversationUpdated', {
            detail: {
              conversationId: incomingConversationId,
              lastMessage: message,
              unreadCount: isFromCurrentUser ? 0 : undefined,
              unreadIncrement: isFromCurrentUser ? undefined : 1,
              lastMessageAt: messageCreatedAt,
            },
          })
        );
      }
    };

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (
        normalizeConversationId(data.conversationId) === currentConversationId
      ) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    };

    const handleMessageStatusUpdate = (data: { messageId: string; status: 'sent' | 'delivered' | 'seen'; conversationId?: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );

      if (data.status === 'seen' && data.conversationId) {
        const normalizedIncomingId = normalizeConversationId(data.conversationId);
        const normalizedCurrentId = normalizeConversationId(conversationId);

        if (normalizedIncomingId === normalizedCurrentId) {
          setConversation((prev) =>
            prev ? { ...prev, unreadCount: 0 } : prev
          );
        }

        setConversations((prev) =>
          (Array.isArray(prev) ? prev : []).map((conv) => {
            const convId = normalizeConversationId(conv.id || conv._id);
            return convId === normalizedIncomingId ? { ...conv, unreadCount: 0 } : conv;
          })
        );

        if (normalizedIncomingId === normalizedCurrentId) {
          window.dispatchEvent(
            new CustomEvent('conversationRead', { detail: { conversationId: normalizedIncomingId } })
          );
        }
      }
    };

    const handleSummaryGeneratedEvent = (data: { conversationId?: string }) => {
      if (!data?.conversationId) return;
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        fetchConversations();
        if (normalizeConversationId(data.conversationId) === currentConversationId) {
          fetchMessages();
        }
      }, 0);
    };

    const handleSocketError = (error: { message?: string }) => {
      console.error('Socket error:', error);
      alert(error.message || 'An error occurred while sending the message. Please try again.');
    };

    socket.on('getMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('messageStatusUpdate', handleMessageStatusUpdate);
    socket.on('summaryGenerated', handleSummaryGeneratedEvent);
    socket.on('conversationDeleted', handleConversationDeleted);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('getMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('messageStatusUpdate', handleMessageStatusUpdate);
      socket.off('summaryGenerated', handleSummaryGeneratedEvent);
      socket.off('conversationDeleted', handleConversationDeleted);
      socket.off('error', handleSocketError);
    };
  }, [
    conversationId,
    socket,
    // Note: fetchConversations and fetchMessages are useCallback functions
    // They're stable and only change when conversationId changes, which is already in deps
    // Including them here would cause infinite loops, so we access them via closure
    clearPendingSummary,
    scrollToBottom,
    upsertSummaryRecord,
    user?.id,
    handleConversationDeleted,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);
  
  // Separate useEffect for initial data loading to prevent infinite loops
  useEffect(() => {
    if (!conversationId) {
      fetchConversations();
      return;
    }
    
    // Only fetch when conversationId changes
    fetchConversations();
    fetchMessages();
    
    // Scroll to bottom when conversation changes (after a short delay to allow messages to load)
    setTimeout(() => {
      scrollToBottom(true);
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change, but only if not loading
    // This handles both initial load and new messages
    if (!messagesLoading && messages.length > 0) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        scrollToBottom(messages.length > 10); // Instant scroll if many messages, smooth if few
      }, 50);
    }
    
    // Mark all unread messages as seen when viewing the conversation
    if (socket && messages.length > 0) {
      const currentUserId = normalizeUserId(user?.id || user?._id);
      const unreadMessages = messages.filter(
        (msg) => {
          const msgSenderId = normalizeUserId(msg.senderId?._id || msg.senderId?.id || msg.senderId);
          return msgSenderId !== currentUserId && msg.status !== 'seen';
        }
      );
      
      if (unreadMessages.length > 0) {
        unreadMessages.forEach((msg) => {
          emitMessageSeen({
            messageId: msg._id,
            conversationId,
          });
        });

        const normalizedCurrentId = normalizeConversationId(conversationId);
        setConversation((prev) => {
          if (!prev) return prev;
          const prevId = normalizeConversationId(prev.id || prev._id);
          if (prevId === normalizedCurrentId) {
            return { ...prev, unreadCount: 0 };
          }
          return prev;
        });
        setConversations((prev) =>
          (Array.isArray(prev) ? prev : []).map((conv) => {
            const convId = normalizeConversationId(conv.id || conv._id);
            return convId === normalizedCurrentId ? { ...conv, unreadCount: 0 } : conv;
          })
        );

        // Trigger a refresh of conversations to update unread counts
        window.dispatchEvent(new CustomEvent('conversationRead', { detail: { conversationId: normalizedCurrentId } }));
      }
    }
  }, [messages, messagesLoading, socket, emitMessageSeen, conversationId, scrollToBottom, user]);

  useEffect(() => {
    if (summaryError) {
      scrollToBottom();
    }
  }, [summaryError, scrollToBottom]);

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

  const handleSendMessage = useCallback((text: string, parentMessageId: string | null = null, attachments?: Array<{ url: string; type: string; name?: string }>) => {
    if (!socket) {
      console.error('Socket not available');
      return;
    }

    const hasText = text && text.trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;

    if (!hasText && !hasAttachments) {
      console.warn('Cannot send message: no text or attachments');
      return;
    }

    // Ensure attachments is always an array
    const normalizedAttachments = Array.isArray(attachments) 
      ? attachments.filter(att => att && att.url && att.type)
      : [];

    const messageData = {
      conversationId,
      text: text.trim() || '',
      attachments: normalizedAttachments,
      parentMessageId: parentMessageId || replyingTo?._id || null,
    };

    console.log('Sending message:', {
      ...messageData,
      attachmentsType: typeof messageData.attachments,
      attachmentsIsArray: Array.isArray(messageData.attachments),
      attachmentsCount: messageData.attachments.length,
    });
    socket.emit('sendMessage', messageData);
    
    setReplyingTo(null);
  }, [socket, conversationId, replyingTo]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!socket) return;
    socket.emit('typing', {
      conversationId,
      isTyping,
    });
  }, [socket, conversationId]);

  const handleSelectConversation = useCallback((selectedConversationId: string) => {
    navigate(`/chats/${selectedConversationId}`);
  }, [navigate]);

  const handleStartConversation = useCallback(async (selectedUser: User) => {
    try {
      const selectedUserId = selectedUser._id || selectedUser.id;

      const existingConv = conversations.find((conv) => {
        if (conv.type !== 'one-to-one') return false;
        const participantId = conv.participant?._id || conv.participant?.id;
        return (
          participantId &&
          (participantId.toString() === selectedUserId.toString() ||
            participantId === selectedUserId)
        );
      });

      if (existingConv) {
        navigate(`/chats/${existingConv.id}`);
        setShowUserList(false);
        return;
      }

      const response = await api.post<{ conversation: { id: string } }>('/conversations', {
        participantId: selectedUserId,
      });

      await fetchConversations();
      navigate(`/chats/${response.data.conversation.id}`);
      setShowUserList(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  }, [conversations, fetchConversations, navigate]);

  const handleStartAIConversation = useCallback(async () => {
    try {
      const aiConversation = conversations.find((conv) => {
        if (conv.type !== 'one-to-one') return false;
        const participantEmail =
          conv.participant?.email ||
          conv.participants?.find((p) => p?.email === 'assistant@demo.com')?.email;
        return participantEmail === 'assistant@demo.com';
      });

      if (aiConversation) {
        navigate(`/chats/${aiConversation.id}`);
        setActiveSection('messages');
        return;
      }

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

  const handleNavigateProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleFetchSummary = async () => {
    if (!isGroupChat || isSummarizing || !conversationId) return;

    setSummaryError(null);
    setIsSummarizing(true);
    scrollToBottom();

    try {
      summaryPendingRef.current = true;
      const response = await api.get<{
        summaryId?: string;
        summary?: string;
        messageCount?: number;
        generatedAt?: string;
        requestedBy?: string;
        requestedByName?: string;
        lastMessageCreatedAt?: string;
        summaryMessage?: { id?: string; _id?: string };
        summaryMessageId?: string;
        rangeStart?: string;
        rangeEnd?: string;
        requestedAt?: string;
        cached?: boolean;
      }>(`/conversations/${conversationId}/summary`);

      const summaryRecord = normalizeSummaryRecord(
        {
          _id: response.data.summaryId,
          text: response.data.summary,
          messageCount: response.data.messageCount,
          generatedAt: response.data.generatedAt,
          requestedBy: response.data.requestedBy,
          requestedByName: response.data.requestedByName,
          lastMessageCreatedAt: response.data.lastMessageCreatedAt,
          summaryMessageId:
            response.data.summaryMessage?.id ||
            response.data.summaryMessage?._id ||
            response.data.summaryMessageId,
          rangeStart: response.data.rangeStart,
          rangeEnd: response.data.rangeEnd,
          requestedAt: response.data.requestedAt,
        },
        'summary'
      );

      if (summaryRecord) {
        upsertSummaryRecord(summaryRecord);
      }

      const fallbackSummaryMessage =
        response.data.summaryMessage ||
        buildSummaryMessagePayload(summaryRecord, conversationId);

      if (fallbackSummaryMessage) {
        let summaryHandled = false;
        setMessages((prev) => {
          const previous = Array.isArray(prev) ? prev : [];
          const incomingId = fallbackSummaryMessage._id || fallbackSummaryMessage.id;
          const index = previous.findIndex((msg) => {
            const msgId = msg._id || msg.id;
            return msgId && incomingId && msgId.toString() === incomingId.toString();
          });

          if (index !== -1) {
            const updated = [...previous];
            updated[index] = { ...updated[index], ...fallbackSummaryMessage };
            summaryHandled = true;
            return updated;
          }

          summaryHandled = true;
          return [...previous, fallbackSummaryMessage];
        });

        if (summaryHandled) {
          clearPendingSummary();
        }
      } else if (response.data.cached) {
        clearPendingSummary();
      }

      scrollToBottom();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      const message =
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to generate summary. Please try again.';
      setSummaryError(message);
      summaryPendingRef.current = false;
      setIsSummarizing(false);
    } finally {
      // If a summary message has already cleared the pending flag, ensure we stay in sync
      if (!summaryPendingRef.current) {
        setIsSummarizing(false);
      }
    }
  };

  const isGroupChat = useMemo(() => conversation?.type === 'group', [conversation?.type]);
  const participant = useMemo(() => conversation?.participant, [conversation?.participant]);
  const participants = useMemo(() => conversation?.participants || [], [conversation?.participants]);
  const displayName = useMemo(() => {
    if (!conversation) return '';
    if (isGroupChat) {
      return conversation.name || 'Group Chat';
    }
    if (participant?.email === 'assistant@demo.com') {
      return assistantDisplayName;
    }
    return participant?.name || participant?.email || 'Unknown User';
  }, [conversation, isGroupChat, participant, assistantDisplayName]);
  const placeholderText = useMemo(() => {
    if (!conversation) return 'Type a message...';
    if (isGroupChat) {
      return 'Share something with the group...';
    }
    const name = participant?.email === 'assistant@demo.com' ? assistantDisplayName : displayName;
    return `Message ${name}...`;
  }, [conversation, isGroupChat, participant, assistantDisplayName, displayName]);
  const isConversationLoading = useMemo(() => listLoading && !conversation, [listLoading, conversation]);
  const isMessagesLoading = useMemo(() => messagesLoading && Boolean(conversation), [messagesLoading, conversation]);
  const isConnected = useMemo(() => Boolean(socket?.connected), [socket?.connected]);
  const canDeleteConversation = useMemo(() => {
    if (!conversation || !user) {
      return false;
    }

    const currentUserId = normalizeUserId(user?.id || user?._id);
    if (!currentUserId) {
      return false;
    }

    const participantIds = (conversation.participants || []).map((participantEntry) =>
      normalizeUserId(
        participantEntry?._id || participantEntry?.id || participantEntry
      )
    );

    if (!participantIds.includes(currentUserId)) {
      return false;
    }

    if (conversation.type === 'group') {
      const adminIds = (conversation.admins || []).map((adminEntry) =>
        normalizeUserId(adminEntry?._id || adminEntry?.id || adminEntry)
      );
      const creatorId = normalizeUserId(
        conversation.createdBy?._id ||
          conversation.createdBy?.id ||
          conversation.createdBy
      );
      return adminIds.includes(currentUserId) || creatorId === currentUserId;
    }

    return true;
  }, [conversation, user]);
  const summaryHighlightNames = useMemo(() => {
    const nameSet = new Set();
    const STOPWORDS = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'that',
      'this',
      'your',
      'you',
      'are',
      'will',
      'have',
      'has',
      'was',
      'were',
      'been',
      'trip',
      'tour',
      'plan',
      'plans',
      'call',
      'chat',
      'team',
      'task',
      'tasks',
      'todo',
      'list',
      'notes',
      'summary',
      'ai',
      'bot',
    ]);

    const maybeAdd = (value: unknown) => {
      const normalized = typeof value === 'string' ? value.trim() : '';
      if (normalized) {
        nameSet.add(normalized);
      }
    };

    const addNameVariants = (raw: unknown) => {
      if (!raw || typeof raw !== 'string') {
        return;
      }

      const normalized = raw
        .replace(/\u2019/g, '\'')
        .replace(/[^\w\s'’.-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalized) {
        return;
      }

      const baseVariants = new Set([
        normalized,
        normalized.replace(/['’]s$/i, ''),
      ]);

      baseVariants.forEach((base) => {
        const trimmedBase = base.trim();
        if (!trimmedBase) {
          return;
        }

        maybeAdd(trimmedBase);

        if (!/['’]s$/i.test(trimmedBase)) {
          maybeAdd(`${trimmedBase}'s`);
          maybeAdd(`${trimmedBase}’s`);
        }

        const tokens = trimmedBase
          .split(/\s+/)
          .map((token) => token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
          .filter(Boolean);

        if (tokens.length >= 2) {
          for (let i = 0; i < tokens.length - 1; i += 1) {
            maybeAdd(`${tokens[i]} ${tokens[i + 1]}`);
          }
        }

        tokens.forEach((token, index) => {
          const cleanedToken = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
          if (!cleanedToken) {
            return;
          }
          const isEdgeToken =
            index === 0 || index === tokens.length - 1;
          const lowerBound = Math.max(
            isEdgeToken ? 4 : 3,
            Math.ceil(trimmedBase.replace(/\s+/g, '').length * 0.3)
          );
          const tokenLower = cleanedToken.toLowerCase();

          const looksLikeName =
            cleanedToken.length >= lowerBound ||
            (/^[A-Z][a-zA-Z]+$/.test(cleanedToken) && cleanedToken.length >= 3);

          if (!looksLikeName || STOPWORDS.has(tokenLower)) {
            return;
          }

          maybeAdd(cleanedToken);

          const tokenWithoutPossessive = cleanedToken.replace(/['’]s$/i, '');
          if (tokenWithoutPossessive && tokenWithoutPossessive !== cleanedToken) {
            maybeAdd(tokenWithoutPossessive);
          }

          if (tokenWithoutPossessive) {
            maybeAdd(`${tokenWithoutPossessive}'s`);
            maybeAdd(`${tokenWithoutPossessive}’s`);
          }
        });
      });
    };

    const addParticipantNames = (person: User | null | undefined) => {
      if (!person) {
        return;
      }

      const fields = [
        'name',
        'displayName',
        'fullName',
        'firstName',
        'lastName',
        'nickname',
        'username',
      ];

      fields.forEach((field) => addNameVariants(person?.[field]));

      if (Array.isArray(person?.aliases)) {
        person.aliases.forEach(addNameVariants);
      }
    };

    if (isGroupChat) {
      participants.forEach(addParticipantNames);
      addNameVariants(conversation?.name);
    } else {
      addParticipantNames(participant);
    }

    addParticipantNames(user);
    addNameVariants(assistantDisplayName);

    return Array.from(nameSet).filter(Boolean);
  }, [
    assistantDisplayName,
    conversation?.name,
    isGroupChat,
    participant,
    participants,
    user,
  ]);

  const otherParticipantForFollowUp = useMemo(() => {
    if (!conversation || conversation.type !== 'one-to-one') {
      return null;
    }

    const currentUserId = normalizeUserId(user?.id || user?._id);
    const primaryParticipant = conversation.participant;

    if (primaryParticipant) {
      const primaryId = normalizeUserId(
        primaryParticipant?._id || primaryParticipant?.id || primaryParticipant
      );
      if (!currentUserId || primaryId !== currentUserId) {
        return primaryParticipant;
      }
    }

    const fallback = (conversation.participants || []).find((participantEntry) => {
      const participantId = normalizeUserId(
        participantEntry?._id || participantEntry?.id || participantEntry
      );
      return participantId && participantId !== currentUserId;
    });

    return fallback || null;
  }, [conversation, user]);

  const handleDeleteConversation = useCallback(async () => {
    if (
      !conversationId ||
      !conversation ||
      !canDeleteConversation ||
      deletingConversation
    ) {
      return;
    }

    const assistantCandidate =
      otherParticipantForFollowUp || conversation?.participant;
    const isAssistantChat =
      !isGroupChat && assistantCandidate?.email === 'assistant@demo.com';

    const targetLabel = isGroupChat
      ? conversation?.name || 'this group chat'
      : isAssistantChat
        ? assistantDisplayName
        : assistantCandidate?.name ||
          assistantCandidate?.email ||
          'this user';

    const confirmationMessage = isGroupChat
      ? `Deleting "${targetLabel}" will remove this group and its message history for all participants. Continue?`
      : `Deleting this conversation will remove your message history with ${targetLabel}. Continue?`;

    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingConversation(true);
      await api.delete(`/conversations/${conversationId}`);

      const targetUserPayload =
        !isGroupChat && otherParticipantForFollowUp
          ? {
              id: normalizeUserId(
                otherParticipantForFollowUp?._id ||
                  otherParticipantForFollowUp?.id ||
                  otherParticipantForFollowUp
              ),
              name: otherParticipantForFollowUp?.name || '',
              email: otherParticipantForFollowUp?.email || '',
            }
          : null;

      setConversations((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (conv) =>
            normalizeConversationId(conv.id || conv._id) !==
            normalizeConversationId(conversationId)
        )
      );
      setMessages([]);
      setConversation(null);
      // Navigate to chats page without opening user list popup
      navigate('/chats');
    } catch (error: unknown) {
      console.error('Failed to delete conversation:', error);
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      const message =
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to delete conversation. Please try again.';
      alert(message);
    } finally {
      setDeletingConversation(false);
    }
  }, [
    conversation,
    conversationId,
    canDeleteConversation,
    deletingConversation,
    isGroupChat,
    assistantDisplayName,
    navigate,
    otherParticipantForFollowUp,
  ]);

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
              onClick={() => setShowUserList(true)}
            >
              + New Chat
            </NewChatButton>
          )}
          <NewChatButton
            $isGroup
            onClick={() => setShowGroupCreator(true)}
            data-tour-id="tour-summary-fallback"
          >
            + Create Group
          </NewChatButton>
        </NewChatButtonContainer>

        <ChatList
          conversations={visibleConversations}
          onSelectConversation={handleSelectConversation}
          loading={listLoading}
        />

        {showUserList && (
          <UserList
            onSelectUser={handleStartConversation}
            onClose={() => setShowUserList(false)}
            currentUserId={user?.id || user?._id}
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

      <ChatWindowContainer>
        <ChatWindowContent>
          {isConversationLoading ? (
            <ChatWindowLoader>
              <Loader message="Loading conversation..." />
            </ChatWindowLoader>
          ) : !conversation ? (
            <ChatWindowLoader>
              <Loader message="Conversation unavailable" />
              <BackToChatsButton
                type="button"
                onClick={() => navigate('/chats')}
              >
                Back to chats
              </BackToChatsButton>
            </ChatWindowLoader>
          ) : (
            <>
            <ChatHeader>
              <BackButton 
                onClick={() => navigate('/chats')}
                aria-label="Back to conversations"
                title="Back to conversations"
              />
              <ChatHeaderInfo>
                {isGroupChat ? (
                  <GroupAvatar>
                    {participants.slice(0, 3).map((p, idx) => (
                      <UserAvatar key={p._id || p.id || idx} user={p} size={30} />
                    ))}
                  </GroupAvatar>
                ) : (
                  <UserAvatar user={participant} size={40} />
                )}
                <div>
                  <ChatHeaderName
                    $clickable={isGroupChat}
                    onClick={isGroupChat ? () => setShowGroupMembers(true) : undefined}
                  >
                    {displayName}
                    {isGroupChat && <GroupInfoIcon>ℹ️</GroupInfoIcon>}
                  </ChatHeaderName>
                  <ChatHeaderStatus>
                    {isGroupChat ? (
                      <span
                        onClick={() => setShowGroupMembers(true)}
                        style={{ cursor: 'pointer' }}
                      >
                        {participants.length} participants
                      </span>
                    ) : participant?.isOnline ? (
                      <StatusOnline>● Online</StatusOnline>
                    ) : (
                      <StatusOffline>
                        ● Last seen{' '}
                        {participant?.lastSeen
                          ? new Date(participant.lastSeen).toLocaleTimeString()
                          : 'recently'}
                      </StatusOffline>
                    )}
                  </ChatHeaderStatus>
                </div>
              </ChatHeaderInfo>
              <ChatHeaderActions>
                {canDeleteConversation && (
                  <DeleteButton
                    onClick={handleDeleteConversation}
                    title="Delete conversation"
                    disabled={deletingConversation}
                    aria-label="Delete conversation"
                  >
                    {deletingConversation ? (
                      <>
                        <LoadingSpinner>⏳</LoadingSpinner>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </DeleteButton>
                )}
                {isGroupChat && (
                  <SummaryButton
                    onClick={handleFetchSummary}
                    title="Summarize recent messages with AI"
                    disabled={isSummarizing}
                    data-tour-id="tour-ai-summary"
                  >
                    <Sparkle aria-hidden="true">✦</Sparkle>
                    {isSummarizing ? 'Summarizing...' : 'AI Summary'}
                  </SummaryButton>
                )}
              </ChatHeaderActions>
            </ChatHeader>

            {replyingTo && (
              <ReplyPreview role="status" aria-live="polite" id="reply-preview">
                <ReplyPreviewContent>
                  <ReplyPreviewSender>
                    Replying to {replyingTo.senderId?.name || 'Unknown'}
                  </ReplyPreviewSender>
                  <ReplyPreviewText>{replyingTo.text}</ReplyPreviewText>
                </ReplyPreviewContent>
                <ReplyPreviewClose 
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  type="button"
                >
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Cancel reply</span>
                </ReplyPreviewClose>
              </ReplyPreview>
            )}

            <ChatMessages
              $isLoading={isMessagesLoading}
              ref={messagesContainerRef}
              data-messages-container
            >
              {isMessagesLoading ? (
                <Loader message="Loading messages..." />
              ) : (
                <>
                  {messages.map((message, index) => {
                    const messageKey =
                      message._id || message.id || message.clientId || `message-${index}`;
                    return (
                      <MessageBubble
                        key={messageKey}
                        message={message}
                        isOwn={
                          message.senderId?._id === user?.id ||
                          message.senderId === user?.id
                        }
                        onReply={() => setReplyingTo(message)}
                        showReplyButton
                        currentUserId={user?.id || user?._id}
                    namesToHighlight={summaryHighlightNames}
                      />
                    );
                  })}
                  {isGroupChat && isSummarizing && (
                    <ChatSummaryCard $pending>
                      <ChatSummaryHeader>
                        <ChatSummaryTitle>AI Summary</ChatSummaryTitle>
                      </ChatSummaryHeader>
                      <ChatSummaryBody>
                        <ChatSummaryLoading>Summarizing recent conversation...</ChatSummaryLoading>
                      </ChatSummaryBody>
                    </ChatSummaryCard>
                  )}
                  {isGroupChat && summaryError && (
                    <ChatSummaryCard $error $inline>
                      <ChatSummaryHeader>
                        <ChatSummaryTitle>AI Summary</ChatSummaryTitle>
                      </ChatSummaryHeader>
                      <ChatSummaryBody>
                        <ChatSummaryErrorText>{summaryError}</ChatSummaryErrorText>
                      </ChatSummaryBody>
                    </ChatSummaryCard>
                  )}
                  {typingUsers.size > 0 && (
                    <TypingIndicator userId={Array.from(typingUsers)[0]} />
                  )}
                  <div ref={messagesEndRef} data-messages-end />
                </>
              )}
            </ChatMessages>

            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onCancelReply={() => setReplyingTo(null)}
              placeholder={placeholderText}
              participants={isGroupChat ? participants : []}
              replyingTo={replyingTo}
            />
            </>
          )}
        </ChatWindowContent>
      </ChatWindowContainer>

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

      {showGroupMembers && isGroupChat && (
        <GroupMembers
          conversation={conversation}
          onClose={() => setShowGroupMembers(false)}
        />
      )}
    </ChatsContainer>
  );
};

export default ChatWindow;

