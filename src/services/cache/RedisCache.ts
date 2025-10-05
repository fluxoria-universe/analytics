import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  prefix?: string;
}

export class RedisCache {
  private redis: Redis;
  private defaultTTL: number;

  constructor() {
    this.redis = new Redis({
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'],
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.defaultTTL = 300000; // 5 minutes default
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      await this.redis.setex(fullKey, Math.floor(ttl / 1000), serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
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
      console.error('Cache delete error:', error);
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
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T }>,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      const ttl = options?.ttl || this.defaultTTL;
      
      for (const { key, value } of keyValuePairs) {
        const fullKey = this.buildKey(key, options?.prefix);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(fullKey, Math.floor(ttl / 1000), serializedValue);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(
    keys: string[],
    options?: CacheOptions
  ): Promise<Array<T | null>> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options?.prefix));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => 
        value ? JSON.parse(value) as T : null
      );
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Delete multiple keys
   */
  async mdelete(keys: string[], options?: CacheOptions): Promise<number> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options?.prefix));
      const result = await this.redis.del(...fullKeys);
      return result;
    } catch (error) {
      console.error('Cache mdelete error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';
      
      // Parse keyspace info
      const keyspaceMatch = keyspace.match(/db0:keys=(\d+)/);
      const keyspaceCount = keyspaceMatch ? keyspaceMatch[1] : '0';
      
      return {
        connected: this.redis.status === 'ready',
        memory,
        keyspace: keyspaceCount,
        hitRate: 0, // Would need to track hits/misses
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        memory: 'unknown',
        keyspace: '0',
        hitRate: 0,
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    if (prefix) {
      return `${prefix}:${key}`;
    }
    return key;
  }

  /**
   * Cache pool data
   */
  async cachePool(poolId: string, poolData: any): Promise<boolean> {
    return this.set(`pool:${poolId}`, poolData, {
      ttl: parseInt(process.env['CACHE_TTL_POOLS'] || '300000'),
      prefix: 'fluxsight',
    });
  }

  /**
   * Get cached pool data
   */
  async getCachedPool(poolId: string): Promise<any | null> {
    return this.get(`pool:${poolId}`, { prefix: 'fluxsight' });
  }

  /**
   * Cache swap data
   */
  async cacheSwaps(poolId: string, page: number, swapData: any): Promise<boolean> {
    return this.set(`swaps:${poolId}:${page}`, swapData, {
      ttl: parseInt(process.env['CACHE_TTL_SWAPS'] || '300000'),
      prefix: 'fluxsight',
    });
  }

  /**
   * Get cached swap data
   */
  async getCachedSwaps(poolId: string, page: number): Promise<any | null> {
    return this.get(`swaps:${poolId}:${page}`, { prefix: 'fluxsight' });
  }

  /**
   * Cache TVL data
   */
  async cacheTVL(poolId: string, tvlData: any): Promise<boolean> {
    return this.set(`tvl:${poolId}`, tvlData, {
      ttl: parseInt(process.env['CACHE_TTL_TVL'] || '60000'),
      prefix: 'fluxsight',
    });
  }

  /**
   * Get cached TVL data
   */
  async getCachedTVL(poolId: string): Promise<any | null> {
    return this.get(`tvl:${poolId}`, { prefix: 'fluxsight' });
  }

  /**
   * Invalidate pool-related caches
   */
  async invalidatePool(poolId: string): Promise<void> {
    const keys = [
      `pool:${poolId}`,
      `tvl:${poolId}`,
    ];
    
    // Also invalidate paginated swap caches (approximate)
    for (let page = 0; page < 10; page++) {
      keys.push(`swaps:${poolId}:${page}`);
    }
    
    await this.mdelete(keys, { prefix: 'fluxsight' });
  }
}
