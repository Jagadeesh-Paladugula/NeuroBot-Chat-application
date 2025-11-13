/**
 * ErrorRecovery Component
 * 
 * Provides error recovery UI with retry and reload options
 * 
 * @example
 * ```tsx
 * <ErrorRecovery
 *   error={error}
 *   onRetry={handleRetry}
 *   onReload={handleReload}
 * />
 * ```
 */

import React from 'react';
import styled from 'styled-components';
import { logger } from '../utils/logger';

interface ErrorRecoveryProps {
  error: Error;
  onRetry?: () => void;
  onReload?: () => void;
  message?: string;
  showDetails?: boolean;
}

const ErrorRecoveryContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 1rem 0;

  .dark-mode & {
    background: #7f1d1d;
    border-color: #991b1b;
  }
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #dc2626;

  .dark-mode & {
    color: #f87171;
  }
`;

const ErrorTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #991b1b;

  .dark-mode & {
    color: #fca5a5;
  }
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #7f1d1d;
  margin-bottom: 1.5rem;

  .dark-mode & {
    color: #fca5a5;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RetryButton = styled(Button)`
  background: #2563eb;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .dark-mode & {
    background: #3b82f6;

    &:hover:not(:disabled) {
      background: #2563eb;
    }
  }
`;

const ReloadButton = styled(Button)`
  background: #64748b;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #475569;
  }

  .dark-mode & {
    background: #475569;

    &:hover:not(:disabled) {
      background: #334155;
    }
  }
`;

const ErrorDetails = styled.details`
  margin-top: 1rem;
  text-align: left;
  width: 100%;
  max-width: 600px;

  summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #991b1b;

    .dark-mode & {
      color: #fca5a5;
    }
  }

  pre {
    padding: 1rem;
    background: #ffffff;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.75rem;
    color: #1e293b;
    max-height: 200px;
    overflow-y: auto;

    .dark-mode & {
      background: #1e293b;
      color: #cbd5e1;
    }
  }
`;

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onReload,
  message = "Something went wrong. Please try again.",
  showDetails = import.meta.env.DEV,
}) => {
  const handleRetry = () => {
    logger.info('Retrying after error', { error: error.message }, 'ErrorRecovery');
    if (onRetry) {
      onRetry();
    }
  };

  const handleReload = () => {
    logger.info('Reloading page after error', { error: error.message }, 'ErrorRecovery');
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  };

  return (
    <ErrorRecoveryContainer role="alert" aria-live="assertive">
      <ErrorIcon aria-hidden="true">⚠️</ErrorIcon>
      <ErrorTitle>Error</ErrorTitle>
      <ErrorMessage>{message}</ErrorMessage>
      <ButtonGroup>
        {onRetry && (
          <RetryButton onClick={handleRetry} aria-label="Retry">
            Retry
          </RetryButton>
        )}
        <ReloadButton onClick={handleReload} aria-label="Reload page">
          Reload Page
        </ReloadButton>
      </ButtonGroup>
      {showDetails && error && (
        <ErrorDetails>
          <summary>Error Details</summary>
          <pre>{error.toString()}</pre>
        </ErrorDetails>
      )}
    </ErrorRecoveryContainer>
  );
};

export default ErrorRecovery;

