import styled, { keyframes } from 'styled-components';

interface LoaderProps {
  message?: string;
  compact?: boolean;
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

const LoaderContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.$compact ? '10px' : '14px'};
  padding: ${props => props.$compact ? '12px 8px' : '24px 16px'};
  color: #4f46e5;

  .dark-mode & {
    color: #c7d2fe;
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

const LoaderRing = styled.span`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid rgba(99, 102, 241, 0.25);
  border-top-color: rgba(99, 102, 241, 0.9);
  animation: ${spin} 1s linear infinite;

  .dark-mode & {
    border-color: rgba(129, 140, 248, 0.15);
    border-top-color: rgba(165, 180, 252, 0.85);
  }
`;

const LoaderDot = styled.span<{ $delay: number }>`
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  opacity: 0;
  animation: ${pulse} 1.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;

  .dark-mode & {
    background: linear-gradient(135deg, #a855f7, #38bdf8);
  }
`;

const LoaderMessage = styled.p`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: #4338ca;
  text-align: center;

  .dark-mode & {
    color: #c7d2fe;
  }
`;

const Loader = ({ message = 'Loading...', compact = false }: LoaderProps) => (
  <LoaderContainer $compact={compact}>
    <LoaderSpinner>
      <LoaderRing />
      <LoaderDot $delay={0} />
      <LoaderDot $delay={0.25} />
      <LoaderDot $delay={0.5} />
    </LoaderSpinner>
    {message ? <LoaderMessage>{message}</LoaderMessage> : null}
  </LoaderContainer>
);

export default Loader;

