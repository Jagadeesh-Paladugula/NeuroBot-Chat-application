import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { logger } from '../utils/logger';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #eff4ff 0%, #f6f7fb 55%, #ffffff 100%);
  color: #0f172a;

  .dark-mode & {
    background: radial-gradient(circle at top, rgba(30, 41, 59, 0.8) 0%, #0b1120 70%);
    color: #e2e8f0;
  }
`;

const ErrorCard = styled.div`
  max-width: 600px;
  width: 100%;
  padding: 2rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  .dark-mode & {
    background: #1e293b;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #dc2626;

  .dark-mode & {
    color: #f87171;
  }
`;

const ErrorMessage = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
  color: #64748b;

  .dark-mode & {
    color: #94a3b8;
  }
`;

const ErrorDetails = styled.details`
  margin-bottom: 1.5rem;

  summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #475569;

    .dark-mode & {
      color: #cbd5e1;
    }
  }

  pre {
    padding: 1rem;
    background: #f1f5f9;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.875rem;
    color: #1e293b;

    .dark-mode & {
      background: #0f172a;
      color: #cbd5e1;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const RetryButton = styled(Button)`
  background: #2563eb;
  color: #ffffff;

  &:hover {
    background: #1d4ed8;
  }

  .dark-mode & {
    background: #3b82f6;
    
    &:hover {
      background: #2563eb;
    }
  }
`;

const ReloadButton = styled(Button)`
  background: #64748b;
  color: #ffffff;

  &:hover {
    background: #475569;
  }

  .dark-mode & {
    background: #475569;
    
    &:hover {
      background: #334155;
    }
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error
    logger.error('ErrorBoundary caught an error', error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Call onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer>
          <ErrorCard>
            <ErrorTitle>Something went wrong</ErrorTitle>
            <ErrorMessage>
              We're sorry, but something unexpected happened. Please try again or refresh the page.
            </ErrorMessage>

            {import.meta.env.DEV && this.state.error && (
              <ErrorDetails>
                <summary>Error Details (Development Only)</summary>
                <pre>
                  {this.state.error.toString()}
                  {'\n\n'}
                  Component Stack:
                  {this.state.errorInfo?.componentStack}
                </pre>
              </ErrorDetails>
            )}

            <ButtonGroup>
              <RetryButton onClick={this.handleRetry} aria-label="Try again">
                Try Again
              </RetryButton>
              <ReloadButton onClick={this.handleReload} aria-label="Reload page">
                Reload Page
              </ReloadButton>
            </ButtonGroup>

            {import.meta.env.DEV && (
              <ErrorMessage style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
                This error is only shown in development. In production, users will see a simplified error message.
              </ErrorMessage>
            )}
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

