import styled, { keyframes } from 'styled-components';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  readReceiptsEnabled: boolean;
  onToggleReadReceipts: () => void;
  updatingReadReceipts: boolean;
  onDeleteAccount: () => void;
  deletingAccount: boolean;
}

const SettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  padding: 20px;
  backdrop-filter: blur(2px);
`;

const SettingsPanelContainer = styled.div`
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  .dark-mode & {
    background: #0f172a;
    color: #e2e8f0;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.45);
  }
  @media (max-width: 540px) {
    padding: 20px;
    gap: 20px;
  }
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  h2 {
    margin: 0;
    font-size: 1.4rem;
  }
  p {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 0.9rem;
    .dark-mode & {
      color: #94a3b8;
    }
  }
`;

const CloseSettingsBtn = styled.button`
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
  transition: transform 0.2s ease, opacity 0.2s ease;
  &:hover {
    opacity: 0.75;
    transform: scale(1.05);
  }
`;

const SettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  h3 {
    margin: 0;
    font-size: 1.05rem;
  }
`;

const SettingsItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  @media (max-width: 540px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SettingsItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 70%;
  @media (max-width: 540px) {
    max-width: 100%;
  }
`;

const SettingsItemTitle = styled.span`
  font-weight: 600;
  color: #1f2937;
  .dark-mode & {
    color: #e2e8f0;
  }
`;

const SettingsItemSubtitle = styled.p`
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
  margin: 0;
  a {
    color: #4f46e5;
    font-weight: 600;
  }
  .dark-mode & {
    color: #94a3b8;
  }
`;

const Toggle = styled.label<{ $disabled?: boolean }>`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  opacity: ${props => props.$disabled ? 0.6 : 1};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  @media (max-width: 540px) {
    align-self: flex-end;
  }
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  input:checked + span {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
  }
  input:checked + span::before {
    transform: translateX(24px);
  }
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 28px;
  &::before {
    position: absolute;
    content: '';
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background-color: #ffffff;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
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

const DeleteAccountBtn = styled.button`
  align-self: flex-start;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    position: relative;
    display: inline-block;
    background: currentColor;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 6h18'/%3E%3Cpath d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/%3E%3Cpath d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/%3E%3Cline x1='10' y1='11' x2='10' y2='17'/%3E%3Cline x1='14' y1='11' x2='14' y2='17'/%3E%3C/svg%3E");
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    transition: transform 0.2s ease;
  }

  .dark-mode & {
    box-shadow: 0 8px 20px rgba(248, 113, 113, 0.3);
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(220, 38, 38, 0.4);
    background: linear-gradient(135deg, #f87171, #ef4444);
    
    &::before {
      transform: scale(1.1);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    
    &::before {
      animation: ${spin} 1s linear infinite;
    }
  }
`;

const SettingsPanel = ({
  isOpen,
  onClose,
  readReceiptsEnabled,
  onToggleReadReceipts,
  updatingReadReceipts,
  onDeleteAccount,
  deletingAccount,
}: SettingsPanelProps) => {
  if (!isOpen) return null;

  return (
    <SettingsOverlay onClick={onClose}>
      <SettingsPanelContainer onClick={(event) => event.stopPropagation()}>
        <SettingsHeader>
          <div>
            <h2>Settings</h2>
            <p>Personalize your NeuroBot experience.</p>
          </div>
          <CloseSettingsBtn
            type="button"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </CloseSettingsBtn>
        </SettingsHeader>

        <SettingsSection>
          <h3>Privacy</h3>
          <SettingsItem>
            <SettingsItemInfo>
              <SettingsItemTitle>Disable read receipts</SettingsItemTitle>
              <SettingsItemSubtitle>
                When disabled, others won't see when you've read their messages.
              </SettingsItemSubtitle>
            </SettingsItemInfo>
            <Toggle $disabled={updatingReadReceipts}>
              <input
                type="checkbox"
                checked={!readReceiptsEnabled}
                onChange={onToggleReadReceipts}
                disabled={updatingReadReceipts}
              />
              <Slider />
            </Toggle>
          </SettingsItem>
        </SettingsSection>

        <SettingsSection>
          <h3>Account</h3>
          <SettingsItemSubtitle>
            Need a fresh start? Remove your profile and data from NeuroBot.
          </SettingsItemSubtitle>
          <DeleteAccountBtn
            type="button"
            onClick={onDeleteAccount}
            disabled={deletingAccount}
            aria-label="Delete account"
            title="Permanently delete your account and all data"
          >
            {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
          </DeleteAccountBtn>
        </SettingsSection>

        <SettingsSection>
          <h3>Help &amp; Support</h3>
          <SettingsItemSubtitle>
            Have questions or need a hand? Reach us at{' '}
            <a href="mailto:edu.cse.jagadeesh@gmail.com">edu.cse.jagadeesh@gmail.com</a>.
          </SettingsItemSubtitle>
        </SettingsSection>
      </SettingsPanelContainer>
    </SettingsOverlay>
  );
};

export default SettingsPanel;

