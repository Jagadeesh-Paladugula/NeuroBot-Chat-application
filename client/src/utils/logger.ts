/**
 * Logger utility for environment-based logging
 * Only logs in development mode, can be extended to send logs to external service in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    const logEntry = this.formatMessage(level, message, data, context);

    // In development, use console
    if (this.isDevelopment) {
      const consoleMethod = console[level] || console.log;
      const prefix = context ? `[${context}]` : '';
      consoleMethod(`${prefix} ${message}`, data || '');
    }

    // In production, you can send to a logging service
    if (this.isProduction && level === 'error') {
      // Example: Send to error tracking service
      // errorTracker.captureMessage(message, { extra: data, tags: { context } });
      this.sendToLoggingService(logEntry);
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    // In production, implement actual logging service integration
    // For now, we'll only log errors to console in production (can be removed)
    if (entry.level === 'error') {
      // Only log critical errors in production console
      // Remove this line if you have a proper logging service
      console.error(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data);
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, error?: unknown, context?: string): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...error }
      : error;
    this.log('error', message, errorData, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };

