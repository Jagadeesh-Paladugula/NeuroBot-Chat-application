import styled, { keyframes } from 'styled-components';

interface LoaderProps {
  message?: string;
  compact?: boolean;
  variant?: 'default' | 'onDark';
}

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(0.6);
    opacity: 0;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
`;

const LoaderContainer = styled.div<{ $compact?: boolean; $variant?: 'default' | 'onDark' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.$compact ? '10px' : '14px'};
  padding: ${props => props.$compact ? '12px 8px' : '24px 16px'};
  color: ${props => props.$variant === 'onDark' ? '#ffffff' : '#4f46e5'};

  .dark-mode & {
    color: ${props => props.$variant === 'onDark' ? '#ffffff' : '#c7d2fe'};
  }
`;

const LoaderSpinner = styled.div`
  position: relative;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoaderRing = styled.span<{ $variant?: 'default' | 'onDark' }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid ${props => props.$variant === 'onDark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(99, 102, 241, 0.25)'};
  border-top-color: ${props => props.$variant === 'onDark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(99, 102, 241, 0.9)'};
  animation: ${spin} 1s linear infinite;

  .dark-mode & {
    border-color: ${props => props.$variant === 'onDark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(129, 140, 248, 0.15)'};
    border-top-color: ${props => props.$variant === 'onDark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(165, 180, 252, 0.85)'};
  }
`;

const LoaderDot = styled.span<{ $delay: number; $variant?: 'default' | 'onDark' }>`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$variant === 'onDark' 
    ? 'linear-gradient(135deg, #ffffff, #e0e7ff)' 
    : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  opacity: 0;
  animation: ${pulse} 1.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;

  .dark-mode & {
    background: ${props => props.$variant === 'onDark' 
      ? 'linear-gradient(135deg, #ffffff, #e0e7ff)' 
      : 'linear-gradient(135deg, #a855f7, #38bdf8)'};
  }
`;

const LoaderMessage = styled.p<{ $variant?: 'default' | 'onDark' }>`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: ${props => props.$variant === 'onDark' ? '#ffffff' : '#4338ca'};
  text-align: center;

  .dark-mode & {
    color: ${props => props.$variant === 'onDark' ? '#ffffff' : '#c7d2fe'};
  }
`;

const Loader = ({ message = 'Loading...', compact = false, variant = 'default' }: LoaderProps) => (
  <LoaderContainer $compact={compact} $variant={variant}>
    <LoaderSpinner>
      <LoaderRing $variant={variant} />
      <LoaderDot $delay={0} $variant={variant} />
      <LoaderDot $delay={0.25} $variant={variant} />
      <LoaderDot $delay={0.5} $variant={variant} />
    </LoaderSpinner>
    {message ? <LoaderMessage $variant={variant}>{message}</LoaderMessage> : null}
  </LoaderContainer>
);

export default Loader;

