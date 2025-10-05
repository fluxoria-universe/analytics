import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/authentication';
import { rateLimit } from '../../src/middleware/rateLimit';
import { errorHandler } from '../../src/middleware/errorHandler';
import { validateInput } from '../../src/middleware/validation';

// Mock JWT service
const mockJWTService = {
  verifyToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
};

jest.mock('../../src/services/auth/JWTService', () => ({
  JWTService: jest.fn(() => mockJWTService),
}));

// Mock Redis cache
const mockRedisCache = {
  get: jest.fn(),
  set: jest.fn(),
  exists: jest.fn(),
};

jest.mock('../../src/services/cache/RedisCache', () => ({
  RedisCache: jest.fn(() => mockRedisCache),
}));

describe('Authentication Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should authenticate valid JWT token', async () => {
    const token = 'valid-jwt-token';
    const decoded = { clientId: 'test-client', permissions: ['read:dex'] };

    req.headers = { authorization: `Bearer ${token}` };
    mockJWTService.extractTokenFromHeader.mockReturnValue(token);
    mockJWTService.verifyToken.mockReturnValue(decoded);

    await authenticate(req as Request, res as Response, next);

    expect(mockJWTService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${token}`);
    expect(mockJWTService.verifyToken).toHaveBeenCalledWith(token);
    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
  });

  it('should reject request without authorization header', async () => {
    req.headers = {};

    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      message: 'No authorization header provided',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', async () => {
    const token = 'invalid-token';

    req.headers = { authorization: `Bearer ${token}` };
    mockJWTService.extractTokenFromHeader.mockReturnValue(token);
    mockJWTService.verifyToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      message: 'Invalid token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Rate Limiting Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      user: { clientId: 'test-client' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow request within rate limit', async () => {
    mockRedisCache.get.mockResolvedValue('5'); // 5 requests made
    mockRedisCache.set.mockResolvedValue(undefined);

    await rateLimit(req as Request, res as Response, next);

    expect(mockRedisCache.get).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should block request exceeding rate limit', async () => {
    mockRedisCache.get.mockResolvedValue('100'); // Exceeded limit

    await rateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Rate limit exceeded',
      message: 'Too many requests',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    mockRedisCache.get.mockRejectedValue(new Error('Redis error'));

    await rateLimit(req as Request, res as Response, next);

    // Should allow request to proceed on Redis error
    expect(next).toHaveBeenCalled();
  });
});

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      message: 'Validation failed',
    });
  });

  it('should handle authentication errors', () => {
    const error = new Error('Unauthorized');
    error.name = 'UnauthorizedError';

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication Error',
      message: 'Unauthorized',
    });
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    });
  });

  it('should handle errors without message', () => {
    const error = new Error();

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});

describe('Input Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should validate request body', () => {
    req.body = { name: 'test', email: 'test@example.com' };

    validateInput(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should sanitize input data', () => {
    req.body = { 
      name: '<script>alert("xss")</script>test', 
      email: 'test@example.com' 
    };

    validateInput(req as Request, res as Response, next);

    expect(req.body.name).toBe('test'); // Script tag should be removed
    expect(next).toHaveBeenCalled();
  });

  it('should reject invalid email format', () => {
    req.body = { email: 'invalid-email' };

    validateInput(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      message: 'Invalid email format',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate required fields', () => {
    req.body = {}; // Missing required fields

    validateInput(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      message: 'Missing required fields',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
