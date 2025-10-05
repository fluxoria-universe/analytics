import { RedisCache } from '../../src/services/cache/RedisCache';

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis),
}));

describe('RedisCache', () => {
  let redisCache: RedisCache;

  beforeEach(() => {
    jest.clearAllMocks();
    redisCache = new RedisCache('redis://localhost:6379');
  });

  afterEach(() => {
    redisCache.disconnect();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(value));
      
      const result = await redisCache.get(key);
      
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      
      mockRedis.get.mockResolvedValue(null);
      
      const result = await redisCache.get(key);
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      const key = 'invalid-json-key';
      
      mockRedis.get.mockResolvedValue('invalid-json');
      
      const result = await redisCache.get(key);
      
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      const key = 'error-key';
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection error'));
      
      await expect(redisCache.get(key)).rejects.toThrow('Redis connection error');
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 3600; // 1 hour default
      
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
      
      await redisCache.set(key, value);
      
      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(mockRedis.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should set value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 1800; // 30 minutes
      
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
      
      await redisCache.set(key, value, ttl);
      
      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(mockRedis.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle Redis errors', async () => {
      const key = 'error-key';
      const value = { data: 'test-data' };
      
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));
      
      await expect(redisCache.set(key, value)).rejects.toThrow('Redis connection error');
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      const key = 'test-key';
      
      mockRedis.del.mockResolvedValue(1);
      
      const result = await redisCache.del(key);
      
      expect(mockRedis.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      
      mockRedis.del.mockResolvedValue(0);
      
      const result = await redisCache.del(key);
      
      expect(result).toBe(false);
    });

    it('should handle Redis errors', async () => {
      const key = 'error-key';
      
      mockRedis.del.mockRejectedValue(new Error('Redis connection error'));
      
      await expect(redisCache.del(key)).rejects.toThrow('Redis connection error');
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      const key = 'existing-key';
      
      mockRedis.exists.mockResolvedValue(1);
      
      const result = await redisCache.exists(key);
      
      expect(mockRedis.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      
      mockRedis.exists.mockResolvedValue(0);
      
      const result = await redisCache.exists(key);
      
      expect(result).toBe(false);
    });

    it('should handle Redis errors', async () => {
      const key = 'error-key';
      
      mockRedis.exists.mockRejectedValue(new Error('Redis connection error'));
      
      await expect(redisCache.exists(key)).rejects.toThrow('Redis connection error');
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      mockRedis.flushall.mockResolvedValue('OK');
      
      await redisCache.clear();
      
      expect(mockRedis.flushall).toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedis.flushall.mockRejectedValue(new Error('Redis connection error'));
      
      await expect(redisCache.clear()).rejects.toThrow('Redis connection error');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached-data' };
      const factory = jest.fn().mockResolvedValue({ data: 'new-data' });
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedValue));
      
      const result = await redisCache.getOrSet(key, factory, 3600);
      
      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if key does not exist', async () => {
      const key = 'test-key';
      const newValue = { data: 'new-data' };
      const factory = jest.fn().mockResolvedValue(newValue);
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.expire.mockResolvedValue(1);
      
      const result = await redisCache.getOrSet(key, factory, 3600);
      
      expect(factory).toHaveBeenCalled();
      expect(result).toEqual(newValue);
      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(newValue));
    });

    it('should handle factory errors', async () => {
      const key = 'test-key';
      const factory = jest.fn().mockRejectedValue(new Error('Factory error'));
      
      mockRedis.get.mockResolvedValue(null);
      
      await expect(redisCache.getOrSet(key, factory, 3600)).rejects.toThrow('Factory error');
    });
  });

  describe('disconnect', () => {
    it('should close Redis connection', () => {
      redisCache.disconnect();
      
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
