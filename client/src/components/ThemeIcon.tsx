import styled from 'styled-components';

interface ThemeIconProps {
  mode?: 'light' | 'dark';
}

const ThemeToggleIcon = styled.span<{ $mode?: 'light' | 'dark' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  font-size: 1.2rem;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.18);
  background: ${props => props.$mode === 'dark' 
    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(17, 24, 39, 0.4))'
    : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(96, 165, 250, 0.25))'};
  ${props => props.$mode === 'dark' && `
    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.25);
  `}
  &:hover {
    transform: translateY(-1px);
  }
`;

const ThemeIcon = ({ mode = 'light' }: ThemeIconProps) => (
  <ThemeToggleIcon $mode={mode}>
    {mode === 'dark' ? '☀️' : '🌙'}
  </ThemeToggleIcon>
);

export default ThemeIcon;

