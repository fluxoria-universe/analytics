import { APIKeyService } from '../../src/services/auth/APIKeyService';

describe('APIKeyService', () => {
  let apiKeyService: APIKeyService;

  beforeEach(() => {
    apiKeyService = new APIKeyService();
  });

  describe('generateAPIKey', () => {
    it('should generate a valid API key', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex', 'read:pool'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(20); // Should be reasonably long
    });

    it('should generate unique API keys', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex'];
      
      const key1 = apiKeyService.generateAPIKey(clientId, permissions);
      const key2 = apiKeyService.generateAPIKey(clientId, permissions);
      
      expect(key1).not.toBe(key2);
    });

    it('should include client ID in key metadata', () => {
      const clientId = 'test-client-123';
      const permissions = ['read:dex'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      const metadata = apiKeyService.getAPIKeyMetadata(apiKey);
      
      expect(metadata).toBeDefined();
      expect(metadata?.clientId).toBe(clientId);
    });
  });

  describe('validateAPIKey', () => {
    it('should validate a correct API key', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      const isValid = apiKeyService.validateAPIKey(apiKey);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid API key', () => {
      const invalidKey = 'invalid-api-key';
      
      const isValid = apiKeyService.validateAPIKey(invalidKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty or null API key', () => {
      expect(apiKeyService.validateAPIKey('')).toBe(false);
      expect(apiKeyService.validateAPIKey(null as any)).toBe(false);
      expect(apiKeyService.validateAPIKey(undefined as any)).toBe(false);
    });
  });

  describe('getAPIKeyMetadata', () => {
    it('should return metadata for valid API key', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex', 'write:pool'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      const metadata = apiKeyService.getAPIKeyMetadata(apiKey);
      
      expect(metadata).toBeDefined();
      expect(metadata?.clientId).toBe(clientId);
      expect(metadata?.permissions).toEqual(permissions);
      expect(metadata?.createdAt).toBeDefined();
    });

    it('should return null for invalid API key', () => {
      const metadata = apiKeyService.getAPIKeyMetadata('invalid-key');
      
      expect(metadata).toBeNull();
    });
  });

  describe('revokeAPIKey', () => {
    it('should revoke a valid API key', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      const isRevoked = apiKeyService.revokeAPIKey(apiKey);
      
      expect(isRevoked).toBe(true);
      
      // Key should no longer be valid
      const isValid = apiKeyService.validateAPIKey(apiKey);
      expect(isValid).toBe(false);
    });

    it('should return false for invalid API key', () => {
      const isRevoked = apiKeyService.revokeAPIKey('invalid-key');
      
      expect(isRevoked).toBe(false);
    });
  });

  describe('getClientAPIKeys', () => {
    it('should return all API keys for a client', () => {
      const clientId = 'test-client';
      
      const key1 = apiKeyService.generateAPIKey(clientId, ['read:dex']);
      const key2 = apiKeyService.generateAPIKey(clientId, ['write:dex']);
      
      const keys = apiKeyService.getClientAPIKeys(clientId);
      
      expect(keys).toHaveLength(2);
      expect(keys).toContain(key1);
      expect(keys).toContain(key2);
    });

    it('should return empty array for non-existent client', () => {
      const keys = apiKeyService.getClientAPIKeys('non-existent-client');
      
      expect(keys).toEqual([]);
    });
  });

  describe('checkPermission', () => {
    it('should return true for valid permission', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex', 'write:pool'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      
      expect(apiKeyService.checkPermission(apiKey, 'read:dex')).toBe(true);
      expect(apiKeyService.checkPermission(apiKey, 'write:pool')).toBe(true);
    });

    it('should return false for invalid permission', () => {
      const clientId = 'test-client';
      const permissions = ['read:dex'];
      
      const apiKey = apiKeyService.generateAPIKey(clientId, permissions);
      
      expect(apiKeyService.checkPermission(apiKey, 'write:dex')).toBe(false);
      expect(apiKeyService.checkPermission(apiKey, 'admin')).toBe(false);
    });

    it('should return false for invalid API key', () => {
      expect(apiKeyService.checkPermission('invalid-key', 'read:dex')).toBe(false);
    });
  });
});
