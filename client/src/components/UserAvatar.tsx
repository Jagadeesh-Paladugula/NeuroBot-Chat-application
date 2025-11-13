import styled, { keyframes, css } from 'styled-components';

interface User {
  email?: string;
  name?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface UserAvatarProps {
  user: User | null | undefined;
  size?: number;
}

const botPulse = keyframes`
  0%, 100% {
    transform: scale(0.96);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
`;

const AvatarContainer = styled.div<{ $size: number; $isBot?: boolean }>`
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  font-size: ${props => props.$size * 0.38}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  ${props => props.$isBot && css`
    background: radial-gradient(circle at 30% 20%, #38bdf8 0%, #1e3a8a 55%, #111927 100%);
    box-shadow: 0 10px 25px rgba(14, 116, 144, 0.32);
    overflow: visible;

    &::before {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: conic-gradient(from 180deg, rgba(14, 116, 144, 0.15), rgba(168, 85, 247, 0.35), rgba(14, 116, 144, 0.15));
      filter: blur(6px);
      z-index: 0;
      animation: ${botPulse} 4s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 30%, rgba(226, 232, 240, 0.9), rgba(148, 163, 184, 0.35));
      opacity: 0.2;
    }
  `}
`;

const BotAvatarFace = styled.div`
  position: relative;
  width: 76%;
  height: 76%;
  border-radius: 28%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92) 0%, rgba(203, 213, 225, 0.8) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18%;
  box-shadow: inset 0 0 0 1.5px rgba(59, 130, 246, 0.35);
  z-index: 1;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -26%;
    width: 18%;
    height: 20%;
    border-radius: 999px;
    background: linear-gradient(145deg, rgba(148, 163, 184, 0.9), rgba(226, 232, 240, 0.6));
    box-shadow: 0 0 6px rgba(191, 219, 254, 0.6);
  }

  &::before {
    left: 20%;
    transform: rotate(-18deg);
  }

  &::after {
    right: 20%;
    transform: rotate(18deg);
  }
`;

const BotAntenna = styled.span`
  position: absolute;
  top: -32%;
  width: 12%;
  height: 34%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(244, 244, 245, 0.8), rgba(148, 163, 184, 0.5));
  box-shadow: 0 0 6px rgba(191, 219, 254, 0.4);
`;

const BotEyes = styled.div`
  display: flex;
  justify-content: center;
  gap: 26%;
  width: 100%;
`;

const BotEye = styled.span`
  width: 26%;
  height: 26%;
  border-radius: 40%;
  background: radial-gradient(circle at 30% 30%, #312e81 0%, #1e1b4b 65%);
  box-shadow: inset 0 0 6px rgba(15, 23, 42, 0.6);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 22%;
    left: 28%;
    width: 32%;
    height: 32%;
    border-radius: 50%;
    background: rgba(191, 219, 254, 0.75);
    opacity: 0.9;
  }
`;

const BotMouth = styled.span`
  width: 45%;
  height: 16%;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.55), rgba(129, 140, 248, 0.35));
  box-shadow: inset 0 0 4px rgba(30, 64, 175, 0.35);
`;

const OnlineIndicator = styled.span`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
`;

const UserAvatar = ({ user, size = 40 }: UserAvatarProps) => {
  if (!user) return null;

  const isAssistant = user.email === 'assistant@demo.com';
  const displayName = isAssistant ? 'NeuroBot AI' : user.name;

  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AvatarContainer $size={size} $isBot={isAssistant} title={displayName}>
      {isAssistant ? (
        <BotAvatarFace>
          <BotAntenna />
          <BotEyes>
            <BotEye />
            <BotEye />
          </BotEyes>
          <BotMouth />
        </BotAvatarFace>
      ) : user.avatarUrl ? (
        <img src={user.avatarUrl} alt={displayName} />
      ) : (
        <span>{getInitials(displayName)}</span>
      )}
      {!isAssistant && user.isOnline && <OnlineIndicator />}
    </AvatarContainer>
  );
};

export default UserAvatar;

