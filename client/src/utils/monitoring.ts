/**
 * Performance monitoring and error tracking utilities
 * Ready for integration with services like Sentry, LogRocket, etc.
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface ErrorEvent {
  error: Error;
  context?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info';
}

class Monitoring {
  private isEnabled: boolean;

  constructor() {
    // Enable monitoring in production or when explicitly enabled
    this.isEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_MONITORING === 'true';
  }

  /**
   * Track performance metric
   */
  trackMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) {
      logger.debug('Performance metric', metric, 'Monitoring');
      return;
    }

    // In production, send to monitoring service
    // Example: monitoringService.trackMetric(metric);
    logger.info('Performance metric', metric, 'Monitoring');
  }

  /**
   * Track error event
   */
  trackError(event: ErrorEvent): void {
    logger.error('Error event', event.error, 'Monitoring');

    if (!this.isEnabled) {
      return;
    }

    // In production, send to error tracking service
    // Example: errorTracker.captureException(event.error, { extra: event.context });
  }

  /**
   * Track page view
   */
  trackPageView(path: string): void {
    if (!this.isEnabled) {
      logger.debug('Page view', { path }, 'Monitoring');
      return;
    }

    // In production, send to analytics service
    // Example: analytics.trackPageView(path);
    logger.info('Page view', { path }, 'Monitoring');
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (!this.isEnabled) {
      logger.debug('Custom event', { name, properties }, 'Monitoring');
      return;
    }

    // In production, send to analytics service
    // Example: analytics.track(name, properties);
    logger.info('Custom event', { name, properties }, 'Monitoring');
  }

  /**
   * Measure performance of a function
   */
  async measurePerformance<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.trackMetric({
        name,
        value: duration,
        unit: 'ms',
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackMetric({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: { error: 'true' },
      });
      throw error;
    }
  }
}

export const monitoring = new Monitoring();

/**
 * Web Vitals tracking
 */
export function trackWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Track Largest Contentful Paint (LCP)
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        monitoring.trackMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
        });
      }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    logger.error('Error tracking LCP', error, 'Monitoring');
  }

  // Track First Input Delay (FID)
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.processingStart && entry.startTime) {
          monitoring.trackMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
          });
        }
      });
    });
    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    logger.error('Error tracking FID', error, 'Monitoring');
  }

  // Track Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput && entry.value) {
          clsValue += entry.value;
        }
      });
      monitoring.trackMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'score',
      });
    });
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    logger.error('Error tracking CLS', error, 'Monitoring');
  }
}

