import { Request, Response, NextFunction } from 'express';
import { RedisCache } from '../services/cache/RedisCache';
import { RateLimitError } from '../types/api';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimitMiddleware {
  private cache: RedisCache;
  private config: RateLimitConfig;

  constructor(cache: RedisCache, config: RateLimitConfig) {
    this.cache = cache;
    this.config = config;
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default: use client ID from JWT token or IP address
    const clientId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    return `rate_limit:${clientId || ip}`;
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(req: Request): Promise<RateLimitInfo> {
    const key = this.generateKey(req);
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    const currentCount = await this.cache.get<number>(windowKey) || 0;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = windowStart + this.config.windowMs;
    
    return {
      limit: this.config.maxRequests,
      remaining,
      resetTime,
    };
  }

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(req: Request): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const key = this.generateKey(req);
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    const currentCount = await this.cache.get<number>(windowKey) || 0;
    
    if (currentCount >= this.config.maxRequests) {
      const resetTime = windowStart + this.config.windowMs;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return {
        allowed: false,
        info: {
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter,
        },
      };
    }

    return {
      allowed: true,
      info: {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - currentCount - 1,
        resetTime: windowStart + this.config.windowMs,
      },
    };
  }

  /**
   * Increment request count
   */
  async incrementCount(req: Request): Promise<void> {
    const key = this.generateKey(req);
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    const currentCount = await this.cache.get<number>(windowKey) || 0;
    const newCount = currentCount + 1;
    
    // Store with TTL equal to window duration
    await this.cache.set(windowKey, newCount, { ttl: this.config.windowMs });
  }

  /**
   * Express middleware for rate limiting
   */
  rateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { allowed, info } = await this.checkRateLimit(req);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'X-RateLimit-Reset': new Date(info.resetTime).toISOString(),
        });

        if (!allowed) {
          const error = new RateLimitError(
            this.config.message || 'Rate limit exceeded',
            info.retryAfter || 0
          );
          
          res.set('Retry-After', (info.retryAfter || 0).toString());
          
          return res.status(429).json({
            errors: [error],
            meta: {
              rateLimit: info,
            },
          });
        }

        // Increment counter after successful check
        await this.incrementCount(req);
        
        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // On error, allow the request to proceed
        next();
      }
    };
  }

  /**
   * Rate limit based on client tier
   */
  createTieredRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user;
        
        if (!user) {
          // No authentication, use default rate limit
          return this.rateLimit()(req, res, next);
        }

        // Create tier-specific config
        const tierConfig: RateLimitConfig = {
          ...this.config,
          maxRequests: user.quotaPerMinute || this.config.maxRequests,
          keyGenerator: (req) => `rate_limit:tier:${user.id}`,
        };

        const tieredMiddleware = new RateLimitMiddleware(this.cache, tierConfig);
        return tieredMiddleware.rateLimit()(req, res, next);
      } catch (error) {
        console.error('Tiered rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Rate limit for specific endpoints
   */
  createEndpointRateLimit(endpoint: string, config: Partial<RateLimitConfig>) {
    const endpointConfig: RateLimitConfig = {
      ...this.config,
      ...config,
      keyGenerator: (req) => `rate_limit:${endpoint}:${(req as any).user?.id || req.ip}`,
    };

    const endpointMiddleware = new RateLimitMiddleware(this.cache, endpointConfig);
    return endpointMiddleware.rateLimit();
  }

  /**
   * Skip rate limiting for certain conditions
   */
  createConditionalRateLimit(skipCondition: (req: Request) => boolean) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (skipCondition(req)) {
        return next();
      }
      
      return this.rateLimit()(req, res, next);
    };
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    windowMs: number;
    maxRequests: number;
  }> {
    // This would require Redis SCAN to get all rate limit keys
    // For now, return basic config info
    return {
      totalKeys: 0, // Would need Redis SCAN implementation
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(req: Request): Promise<boolean> {
    const key = this.generateKey(req);
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    return this.cache.delete(windowKey);
  }

  /**
   * Clear all rate limit data
   */
  async clearAll(): Promise<boolean> {
    // This would require Redis pattern matching to delete all rate limit keys
    // For now, just clear the entire cache
    return this.cache.clear();
  }
}
