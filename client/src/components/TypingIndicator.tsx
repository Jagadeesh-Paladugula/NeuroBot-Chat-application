import styled, { keyframes } from 'styled-components';

interface TypingIndicatorProps {
  userId: string;
}

const typing = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
`;

const TypingIndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  max-width: 100px;
  border-bottom-left-radius: 4px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 4px;

  span {
    width: 8px;
    height: 8px;
    background: #9ca3af;
    border-radius: 50%;
    animation: ${typing} 1.4s infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
`;

const TypingText = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
`;

const TypingIndicator = ({ userId }: TypingIndicatorProps) => {
  return (
    <TypingIndicatorContainer>
      <TypingDots>
        <span></span>
        <span></span>
        <span></span>
      </TypingDots>
      <TypingText>Typing...</TypingText>
    </TypingIndicatorContainer>
  );
};

export default TypingIndicator;

