import { JWTService } from '../../src/services/auth/JWTService';
import { readFileSync } from 'fs';
import path from 'path';

describe('JWTService', () => {
  let jwtService: JWTService;
  const privateKey = readFileSync(path.join(__dirname, '../../jwt_private.pem'), 'utf8');
  const publicKey = readFileSync(path.join(__dirname, '../../jwt_public.pem'), 'utf8');

  beforeEach(() => {
    jwtService = new JWTService(privateKey, publicKey);
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { 
        clientId: 'test-client', 
        permissions: ['read:dex', 'read:pool'] 
      };
      
      const token = jwtService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate token with correct payload', () => {
      const payload = { 
        clientId: 'test-client-123', 
        permissions: ['read:dex', 'write:dex'] 
      };
      
      const token = jwtService.generateToken(payload);
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded.clientId).toBe(payload.clientId);
      expect(decoded.permissions).toEqual(payload.permissions);
    });

    it('should include expiration time', () => {
      const payload = { clientId: 'test-client' };
      const token = jwtService.generateToken(payload);
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { clientId: 'test-client' };
      const token = jwtService.generateToken(payload);
      
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded.clientId).toBe(payload.clientId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwtService.verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      const payload = { clientId: 'test-client' };
      const token = jwtService.generateToken(payload, -1); // Expired immediately
      
      expect(() => {
        jwtService.verifyToken(token);
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        jwtService.verifyToken('not-a-jwt');
      }).toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should generate a new token with same payload', () => {
      const payload = { 
        clientId: 'test-client', 
        permissions: ['read:dex'] 
      };
      const originalToken = jwtService.generateToken(payload);
      
      const newToken = jwtService.refreshToken(originalToken);
      
      expect(newToken).not.toBe(originalToken);
      
      const originalDecoded = jwtService.verifyToken(originalToken);
      const newDecoded = jwtService.verifyToken(newToken);
      
      expect(newDecoded.clientId).toBe(originalDecoded.clientId);
      expect(newDecoded.permissions).toEqual(originalDecoded.permissions);
    });

    it('should throw error when refreshing invalid token', () => {
      expect(() => {
        jwtService.refreshToken('invalid-token');
      }).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;
      
      const extracted = jwtService.extractTokenFromHeader(header);
      
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(jwtService.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(jwtService.extractTokenFromHeader('')).toBeNull();
      expect(jwtService.extractTokenFromHeader('Bearer')).toBeNull();
    });

    it('should handle null/undefined header', () => {
      expect(jwtService.extractTokenFromHeader(null as any)).toBeNull();
      expect(jwtService.extractTokenFromHeader(undefined as any)).toBeNull();
    });
  });
});
