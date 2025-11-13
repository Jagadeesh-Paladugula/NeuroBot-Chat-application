/**
 * Client-side rate limiter utility
 * Prevents API spam and potential DoS
 */

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  key?: string; // Optional key for different rate limiters
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string = 'default'): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    // No record or window expired
    if (!record || now > record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    // Within window, check count
    if (record.count < this.maxRequests) {
      record.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Get time until reset (in milliseconds)
   */
  getTimeUntilReset(key: string = 'default'): number {
    const record = this.requests.get(key);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }

  /**
   * Reset rate limiter for a key
   */
  reset(key: string = 'default'): void {
    this.requests.delete(key);
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.requests.clear();
  }
}

// Create default rate limiters
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60000, // per minute
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 requests
  windowMs: 60000, // per minute (for login/register)
});

export const messageRateLimiter = new RateLimiter({
  maxRequests: 30, // 30 messages
  windowMs: 60000, // per minute
});

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: RateLimiter,
  key?: string
): T {
  return (async (...args: any[]) => {
    if (!limiter.isAllowed(key)) {
      const timeUntilReset = limiter.getTimeUntilReset(key);
      throw new Error(
        `Rate limit exceeded. Please try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`
      );
    }
    return fn(...args);
  }) as T;
}

