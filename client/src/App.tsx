import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Loader from './components/Loader';
import GuidedTour from './containers/GuidedTour';
import { RouteTracker } from './components/RouteTracker';
import { logger } from './utils/logger';

// Lazy load routes for code splitting
const Landing = lazy(() => import('./containers/Landing'));
const Chats = lazy(() => import('./containers/Chats'));
const ChatWindow = lazy(() => import('./containers/ChatWindow'));
const Profile = lazy(() => import('./containers/Profile'));
const Analytics = lazy(() => import('./containers/Analytics'));

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useAuth();

  // Only show loader if we're loading AND we don't have a user yet
  // This prevents showing loader after login when user is already set
  if (loading && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader message="Warming up NeuroBot..." />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" />;
};

const SocketWrapper = ({ children }: { children: ReactNode }) => {
  // Initialize socket connection
  useSocket();
  return <>{children}</>;
};

// Loading fallback component
const RouteLoader = ({ message = 'Loading...' }: { message?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Loader message={message} />
  </div>
);

function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error('Route ErrorBoundary caught an error', error, 'App');
  };

  return (
    <ThemeProvider>
      <ErrorBoundary onError={handleError}>
        <AuthProvider>
          <Router>
            <ErrorBoundary onError={handleError}>
              <RouteTracker />
              <GuidedTour />
              <Suspense fallback={<RouteLoader message="Loading page..." />}>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <ErrorBoundary onError={handleError}>
                        <Landing />
                      </ErrorBoundary>
                    } 
                  />
                  <Route
                    path="/chats"
                    element={
                      <ErrorBoundary onError={handleError}>
                        <PrivateRoute>
                          <SocketProvider>
                            <SocketWrapper>
                              <Chats />
                            </SocketWrapper>
                          </SocketProvider>
                        </PrivateRoute>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/chats/:conversationId"
                    element={
                      <ErrorBoundary onError={handleError}>
                        <PrivateRoute>
                          <SocketProvider>
                            <SocketWrapper>
                              <ChatWindow />
                            </SocketWrapper>
                          </SocketProvider>
                        </PrivateRoute>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ErrorBoundary onError={handleError}>
                        <PrivateRoute>
                          <Profile />
                        </PrivateRoute>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <ErrorBoundary onError={handleError}>
                        <PrivateRoute>
                          <Analytics />
                        </PrivateRoute>
                      </ErrorBoundary>
                    }
                  />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

