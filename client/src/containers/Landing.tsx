import { useState, useEffect, useRef, useCallback, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Loader from '../components/Loader';

const buttonSpin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LandingContainer = styled.div<{ $isLoading: boolean }>`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  transition: filter 0.3s ease, opacity 0.3s ease;

  ${props => props.$isLoading && `
    .landing-content {
      opacity: 0;
      pointer-events: none;
    }
  `}

  .dark-mode & {
    background: radial-gradient(circle at top, rgba(17, 24, 39, 0.9) 0%, #0b1120 70%);
  }
`;

const LandingLoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(1.5px);
  z-index: 999;
`;

const LandingContent = styled.div`
  width: 100%;
  max-width: 450px;
`;

const LandingHeader = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 30px;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .dark-mode & {
    color: #e0e7ff;

    p {
      color: rgba(191, 219, 254, 0.85);
    }
  }
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  .dark-mode & {
    background: rgba(17, 24, 39, 0.95);
    box-shadow: 0 24px 50px rgba(2, 6, 23, 0.55);
    border: 1px solid rgba(59, 130, 246, 0.18);
  }
`;

const AuthTabs = styled.div`
  display: flex;
  margin-bottom: 25px;
  border-bottom: 2px solid #e5e7eb;

  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.25);
  }
`;

const AuthTabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 500;
  color: ${props => props.$active ? '#667eea' : '#6b7280'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#667eea' : 'transparent'};
  margin-bottom: -2px;
  transition: all 0.2s;

  .dark-mode & {
    color: ${props => props.$active ? '#a5b4fc' : 'rgba(203, 213, 225, 0.8)'};
    border-bottom-color: ${props => props.$active ? '#a5b4fc' : 'transparent'};
  }
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 500;
    color: #374151;
    font-size: 0.9rem;

    .dark-mode & {
      color: #cbd5f5;
    }
  }

  input {
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #667eea;
    }

    &::placeholder {
      .dark-mode & {
        color: rgba(148, 163, 184, 0.7);
      }
    }

    .dark-mode & {
      background: rgba(15, 23, 42, 0.85);
      border-color: rgba(148, 163, 184, 0.3);
      color: #f8fafc;

      &:focus {
        border-color: #818cf8;
      }
    }
  }
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;

  .dark-mode & {
    background: rgba(248, 113, 113, 0.18);
    color: #fecaca;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 12px 30px rgba(79, 70, 229, 0.35);

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonSpinner = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
  animation: ${buttonSpin} 0.8s linear infinite;
`;

const DemoSection = styled.div`
  margin-top: 25px;
  padding-top: 25px;
`;

const DemoDivider = styled.div`
  text-align: center;
  margin-bottom: 15px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e5e7eb;
  }

  span {
    background: white;
    padding: 0 15px;
    color: #6b7280;
    font-size: 0.9rem;
    position: relative;
  }

  .dark-mode & {
    &::before {
      background: rgba(148, 163, 184, 0.25);
    }

    span {
      background: rgba(17, 24, 39, 0.95);
      color: rgba(203, 213, 225, 0.8);
    }
  }
`;

const DemoButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const DemoButton = styled.button`
  flex: 1;
  padding: 10px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dark-mode & {
    background: rgba(30, 41, 59, 0.85);
    color: #e2e8f0;
    border-color: rgba(148, 163, 184, 0.25);

    &:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.18);
      border-color: rgba(129, 140, 248, 0.32);
    }
  }
`;

const OAuthSection = styled.div`
  margin-top: 20px;
`;

const GoogleButtonSlot = styled.div`
  display: flex;
  justify-content: center;
`;

const OAuthMissingConfig = styled.p`
  margin-top: 20px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  text-align: center;

  .dark-mode & {
    background: rgba(248, 113, 113, 0.16);
    color: #fca5a5;
    border-color: rgba(248, 113, 113, 0.28);
  }
`;

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        if (!formData.name) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        navigate('/chats');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = useCallback(async (response: { credential?: string }) => {
    const credential = response?.credential;
    if (!credential) {
      setError('Google login failed. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await loginWithGoogle(credential);
    if (result.success) {
      navigate('/chats');
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (!isLogin) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      googleInitializedRef.current = false;
    }
  }, [isLogin]);

  useEffect(() => {
    if (!isLogin || !googleClientId || !googleButtonRef.current || googleInitializedRef.current) {
      return;
    }

    let isCancelled = false;
    const initializeGoogle = () => {
      if (isCancelled || googleInitializedRef.current) {
        return;
      }
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          type: 'standard',
          shape: 'rectangular',
        });
        googleInitializedRef.current = true;
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const intervalId = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGoogle();
          clearInterval(intervalId);
        }
      }, 200);

      return () => {
        isCancelled = true;
        clearInterval(intervalId);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [googleClientId, handleGoogleResponse, isLogin]);

  const handleDemoLogin = async (email: string, password: string) => {
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/chats');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const submitLabel = isLogin ? 'Login' : 'Sign Up';
  const loadingMessage = isLogin ? 'Signing you in' : 'Creating your account';

  return (
    <LandingContainer $isLoading={loading}>
      {loading && (
        <LandingLoadingOverlay aria-live="polite">
          <Loader message={loadingMessage} />
        </LandingLoadingOverlay>
      )}
      <LandingContent className="landing-content">
        <LandingHeader>
          <h1>NeuroBot</h1>
          <p>Real-time chat · AI-powered messaging bot</p>
        </LandingHeader>

        <AuthCard>
          <AuthTabs>
            <AuthTabButton
              $active={isLogin}
              onClick={() => setIsLogin(true)}
            >
              Login
            </AuthTabButton>
            <AuthTabButton
              $active={!isLogin}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </AuthTabButton>
          </AuthTabs>

          <AuthForm onSubmit={handleSubmit}>
            {!isLogin && (
              <FormGroup>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  required={!isLogin}
                  aria-required="true"
                  aria-invalid={error && error.includes('name') ? 'true' : 'false'}
                  aria-describedby={error && error.includes('name') ? 'name-error' : undefined}
                  autoComplete="name"
                />
                {error && error.includes('name') && (
                  <span id="name-error" className="sr-only" role="alert">
                    {error}
                  </span>
                )}
              </FormGroup>
            )}

            <FormGroup>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                required
                aria-required="true"
                aria-invalid={error && error.includes('email') ? 'true' : 'false'}
                aria-describedby={error && error.includes('email') ? 'email-error' : undefined}
                autoComplete="email"
              />
              {error && error.includes('email') && (
                <span id="email-error" className="sr-only" role="alert">
                  {error}
                </span>
              )}
            </FormGroup>

            <FormGroup>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
                minLength={6}
                aria-required="true"
                aria-invalid={error && error.includes('password') ? 'true' : 'false'}
                aria-describedby={error && error.includes('password') ? 'password-error' : undefined}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              {error && error.includes('password') && (
                <span id="password-error" className="sr-only" role="alert">
                  {error}
                </span>
              )}
            </FormGroup>

            {error && (
              <ErrorMessage role="alert" aria-live="polite">
                {error}
              </ErrorMessage>
            )}

            <SubmitButton 
              type="submit" 
              disabled={loading}
              aria-label={loading ? loadingMessage : submitLabel}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <ButtonSpinner aria-hidden="true" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                submitLabel
              )}
            </SubmitButton>
          </AuthForm>

          {isLogin && (
            <DemoSection>
              <DemoDivider>
                <span>Or try demo accounts</span>
              </DemoDivider>
              <DemoButtons>
                <DemoButton
                  onClick={() => handleDemoLogin('demo1@example.com', 'demo123')}
                  disabled={loading}
                >
                  Demo User 1
                </DemoButton>
                <DemoButton
                  onClick={() => handleDemoLogin('demo2@example.com', 'demo123')}
                  disabled={loading}
                >
                  Demo User 2
                </DemoButton>
                <DemoButton
                  onClick={() => handleDemoLogin('admin@example.com', 'admin123')}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                >
                  Admin User
                </DemoButton>
              </DemoButtons>
            </DemoSection>
          )}

          {isLogin && googleClientId && (
            <OAuthSection>
              <DemoDivider>
                <span>Or continue with</span>
              </DemoDivider>
              <GoogleButtonSlot ref={googleButtonRef} />
            </OAuthSection>
          )}

          {isLogin && !googleClientId && (
            <OAuthMissingConfig>
              Google sign-in is unavailable. Ask the administrator to set <code>VITE_GOOGLE_CLIENT_ID</code>.
            </OAuthMissingConfig>
          )}
        </AuthCard>
      </LandingContent>
    </LandingContainer>
  );
};

export default Landing;
