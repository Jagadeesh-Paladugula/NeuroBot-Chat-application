import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import App from './App';
import { GlobalStyle } from './styles/GlobalStyle';
import { apolloClient } from './graphql/client';
import ErrorBoundary from './components/ErrorBoundary';
import { validateEnvironment } from './utils/env';
import { logger } from './utils/logger';
import { trackWebVitals, monitoring } from './utils/monitoring';

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed', error);
  // In production, show error to user
  if (import.meta.env.PROD) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; padding: 2rem; text-align: center;">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Configuration Error</h1>
          <p style="color: #64748b; margin-bottom: 1rem;">${error instanceof Error ? error.message : 'Invalid environment configuration'}</p>
          <p style="color: #94a3b8; font-size: 0.875rem;">Please check your environment variables and try again.</p>
        </div>
      </div>
    `;
    throw error;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  logger.error('ErrorBoundary caught an error', error, 'ErrorBoundary');
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Example: errorTracker.captureException(error, { extra: errorInfo });
  }
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary onError={handleError}>
      <ApolloProvider client={apolloClient}>
        <ErrorBoundary onError={handleError}>
          <GlobalStyle />
          <App />
        </ErrorBoundary>
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Track Web Vitals for performance monitoring
trackWebVitals();

// Track initial page load
monitoring.trackPageView(window.location.pathname);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered', { scope: registration.scope }, 'ServiceWorker');
      })
      .catch((error) => {
        logger.error('Service Worker registration failed', error, 'ServiceWorker');
      });
  });
}

