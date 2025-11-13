/**
 * Route tracker component for monitoring page views
 * Tracks route changes in React Router
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { monitoring } from '../utils/monitoring';

export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    monitoring.trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}

