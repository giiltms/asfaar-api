import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl: number;
  private readonly defaultPrefix: string = 'app';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('redis');
    this.defaultTtl = redisConfig.REDIS_TTL || 3600;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);

      if (!value) {
        return null;
      }

      return options?.serialize !== false ? JSON.parse(value) : value;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTtl;
      const serializedValue = options?.serialize !== false ? JSON.stringify(value) : String(value);

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence: ${key}`, error);
      return false;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number, options?: CacheOptions): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiration for cache key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options?.prefix));
      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
        if (!value) return null;
        return options?.serialize !== false ? JSON.parse(value) : value;
      });
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys', error);
      return keys.map(() => null);
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete cache keys by pattern: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Cache with automatic refresh
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  /**
   * Clear all cache with optional prefix
   */
  async clear(prefix?: string): Promise<number> {
    try {
      const pattern = prefix ? `${prefix}:*` : `${this.defaultPrefix}:*`;
      return await this.deleteByPattern(pattern);
    } catch (error) {
      this.logger.error(`Failed to clear cache with prefix: ${prefix}`, error);
      return 0;
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.defaultPrefix;
    return `${keyPrefix}:${key}`;
  }
} 