import { SetMetadata } from '@nestjs/common';

export const THROTTLE_METADATA_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number; // Time to live in seconds
  skipIf?: (request: any) => boolean;
  keyGenerator?: (request: any) => string;
  message?: string;
}

/**
 * Decorator to apply rate limiting to a route or controller
 * @param options Throttle configuration options
 */
export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_METADATA_KEY, options);

/**
 * Common throttle configurations
 */
export const ThrottleConfigs = {
  /**
   * Strict rate limiting - 5 requests per minute
   */
  STRICT: { limit: 5, ttl: 60 },

  /**
   * Normal rate limiting - 20 requests per minute
   */
  NORMAL: { limit: 20, ttl: 60 },

  /**
   * Lenient rate limiting - 100 requests per minute
   */
  LENIENT: { limit: 100, ttl: 60 },

  /**
   * Auth routes - 10 requests per 5 minutes
   */
  AUTH: { limit: 10, ttl: 300 },

  /**
   * File upload - 5 uploads per hour
   */
  UPLOAD: { limit: 5, ttl: 3600 },

  /**
   * Password reset - 3 attempts per hour
   */
  PASSWORD_RESET: { limit: 3, ttl: 3600 },
} as const; 