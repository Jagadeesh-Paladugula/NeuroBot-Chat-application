import { useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import ThemeIcon from './ThemeIcon';

interface User {
  name?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

interface MainSidebarProps {
  activeSection: 'messages' | 'groups';
  onSelectSection: (section: 'messages' | 'groups') => void;
  onStartAIConversation: () => void;
  unreadMessages?: number;
  unreadGroups?: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenAnalytics?: () => void;
  onLogout: () => void;
  user?: User | null;
}

const aiPulse = keyframes`
  0%, 100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
`;

const aiRotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const aiOrbit = keyframes`
  0% {
    transform: rotate(0deg) translateX(12px) rotate(0deg);
  }
  100% {
    transform: rotate(360deg) translateX(12px) rotate(-360deg);
  }
`;

const MainSidebarContainer = styled.aside<{ $isDarkMode: boolean }>`
  width: 78px;
  background: ${props => props.$isDarkMode 
    ? 'rgba(17, 24, 39, 0.86)' 
    : 'rgba(255, 255, 255, 0.9)'};
  border-right: 1px solid ${props => props.$isDarkMode 
    ? 'rgba(148, 163, 184, 0.12)' 
    : 'rgba(15, 23, 42, 0.08)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0;
  gap: 28px;
  box-shadow: ${props => props.$isDarkMode 
    ? '0 26px 40px rgba(2, 6, 23, 0.6)' 
    : '0 26px 40px rgba(15, 23, 42, 0.08)'};
  backdrop-filter: blur(18px);
  z-index: 2;

  @media (max-width: 900px) {
    width: 64px;
    padding: 14px 0;
  }

  @media (max-width: 640px) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 64px;
    flex-direction: row;
    justify-content: space-evenly;
    padding: 0 12px;
    border-right: none;
    border-top: 1px solid ${props => props.$isDarkMode ? '#2d3748' : 'rgba(229, 231, 235, 0.9)'};
    gap: 0;
  }
`;

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: row;
    gap: 12px;
    height: 100%;
    align-items: center;
  }
`;

const SidebarBottom = styled(SidebarSection)`
  margin-top: auto;
  padding-bottom: 12px;

  @media (max-width: 640px) {
    margin-top: 0;
    padding-bottom: 0;
  }
`;

const SidebarIcon = styled.button<{ $active?: boolean; $isDarkMode?: boolean; $isLogout?: boolean }>`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: none;
  background: ${props => props.$active 
    ? (props.$isDarkMode 
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(79, 70, 229, 0.28))'
      : 'linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.26))')
    : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  font-size: 1.6rem;
  color: ${props => {
    if (props.$isLogout) {
      return props.$isDarkMode ? '#fca5a5' : '#dc2626';
    }
    return props.$isDarkMode ? '#e2e8f0' : '#111827';
  }};
  padding: 0;

  &:hover {
    background: ${props => {
      if (props.$isLogout) {
        return props.$isDarkMode ? 'rgba(248, 113, 113, 0.16)' : 'rgba(239, 68, 68, 0.15)';
      }
      return props.$isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(79, 70, 229, 0.12)';
    }};
    transform: translateY(-2px);
  }

  @media (max-width: 900px) {
    width: 40px;
    height: 40px;
    font-size: 1.4rem;
  }

  @media (max-width: 640px) {
    width: 40px;
    height: 40px;
  }
`;

const ThemeToggleBtn = styled(SidebarIcon)`
  border: 1px solid ${props => props.$isDarkMode 
    ? 'rgba(165, 180, 252, 0.25)' 
    : 'rgba(99, 102, 241, 0.28)'};
  background: ${props => props.$isDarkMode
    ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.25), rgba(30, 64, 175, 0.22))'
    : 'linear-gradient(145deg, rgba(129, 140, 248, 0.18), rgba(79, 70, 229, 0.08))'};
  box-shadow: ${props => props.$isDarkMode
    ? '0 8px 20px rgba(30, 64, 175, 0.25)'
    : '0 8px 18px rgba(79, 70, 229, 0.18)'};

  &:hover {
    background: ${props => props.$isDarkMode
      ? 'linear-gradient(145deg, rgba(129, 140, 248, 0.32), rgba(30, 64, 175, 0.3))'
      : 'linear-gradient(145deg, rgba(129, 140, 248, 0.26), rgba(79, 70, 229, 0.16))'};
  }
`;

const AIIconButton = styled(SidebarIcon)`
  padding: 0;
`;

const AIIcon = styled.span`
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AIGlow = styled.span`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.7) 0%, rgba(59, 130, 246, 0.1) 70%, transparent 100%);
  animation: ${aiPulse} 3s ease-in-out infinite;
  filter: blur(2px);
`;

const AICore = styled.span`
  position: relative;
  width: 14px;
  height: 14px;
  border-radius: 40% 60% 55% 45%;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
  animation: ${aiRotate} 6s linear infinite;
`;

const AIOrb = styled.span<{ $orb: number }>`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22d3ee, #a855f7);
  opacity: 0.8;
  top: ${props => props.$orb === 1 ? '-4px' : 'auto'};
  right: ${props => props.$orb === 2 ? '-3px' : 'auto'};
  bottom: ${props => props.$orb === 3 ? '-3px' : 'auto'};
  animation: ${aiOrbit} ${props => {
    if (props.$orb === 1) return '3.5s';
    if (props.$orb === 2) return '4s';
    return '5s';
  }} linear infinite ${props => props.$orb === 2 ? 'reverse' : 'normal'};
`;

const SidebarBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 3px;
  background: linear-gradient(135deg, #ec4899, #ef4444);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 4px 10px rgba(236, 72, 153, 0.3);
`;

const SidebarProfileAvatar = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MainSidebar = ({
  activeSection,
  onSelectSection,
  onStartAIConversation,
  unreadMessages = 0,
  unreadGroups = 0,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenProfile,
  onOpenAnalytics,
  onLogout,
  user,
}: MainSidebarProps) => {
  const renderBadge = useCallback((count: number) => {
    if (!count || count <= 0) return null;

    const displayCount = count > 9 ? '9+' : count;
    return <SidebarBadge>{displayCount}</SidebarBadge>;
  }, []);

  const renderProfileIcon = useCallback(() => {
    if (user?.avatarUrl) {
      return (
        <SidebarProfileAvatar>
          <img src={user.avatarUrl} alt={user?.name || 'Profile'} />
        </SidebarProfileAvatar>
      );
    }
    return <span>👤</span>;
  }, [user?.avatarUrl, user?.name]);

  return (
    <MainSidebarContainer $isDarkMode={isDarkMode}>
      <SidebarSection>
        <SidebarIcon
          type="button"
          $active={activeSection === 'messages'}
          $isDarkMode={isDarkMode}
          onClick={() => onSelectSection('messages')}
          title="Messages"
          aria-label="Messages"
        >
          <span>💬</span>
          {renderBadge(unreadMessages)}
        </SidebarIcon>
        <SidebarIcon
          type="button"
          $active={activeSection === 'groups'}
          $isDarkMode={isDarkMode}
          onClick={() => onSelectSection('groups')}
          title="Groups"
          aria-label="Groups"
          data-tour-id="tour-groups-icon"
        >
          <span>👥</span>
          {renderBadge(unreadGroups)}
        </SidebarIcon>
      </SidebarSection>

      <SidebarSection>
        <AIIconButton
          type="button"
          $isDarkMode={isDarkMode}
          onClick={onStartAIConversation}
          title="NeuroBot AI"
          aria-label="NeuroBot AI"
          data-tour-id="tour-ai-bot"
        >
          <AIIcon>
            <AIGlow />
            <AICore />
            <AIOrb $orb={1} />
            <AIOrb $orb={2} />
            <AIOrb $orb={3} />
          </AIIcon>
        </AIIconButton>
        <ThemeToggleBtn
          type="button"
          $isDarkMode={isDarkMode}
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
          data-tour-id="tour-theme-toggle"
        >
          <ThemeIcon mode={isDarkMode ? 'dark' : 'light'} />
        </ThemeToggleBtn>
      </SidebarSection>

      <SidebarBottom>
        {user?.isAdmin && onOpenAnalytics && (
          <SidebarIcon
            type="button"
            $isDarkMode={isDarkMode}
            onClick={onOpenAnalytics}
            title="Analytics"
            aria-label="Analytics"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.28))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.26))',
            }}
          >
            <span>📊</span>
          </SidebarIcon>
        )}
        <SidebarIcon
          type="button"
          $isDarkMode={isDarkMode}
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <span>⚙️</span>
        </SidebarIcon>
        <SidebarIcon
          type="button"
          $isDarkMode={isDarkMode}
          onClick={onOpenProfile}
          title="Profile"
          aria-label="Profile"
        >
          {renderProfileIcon()}
        </SidebarIcon>
        <SidebarIcon
          type="button"
          $isDarkMode={isDarkMode}
          $isLogout
          onClick={onLogout}
          title="Logout"
          aria-label="Logout"
        >
          <span>⏻</span>
        </SidebarIcon>
      </SidebarBottom>
    </MainSidebarContainer>
  );
};

export default MainSidebar;

