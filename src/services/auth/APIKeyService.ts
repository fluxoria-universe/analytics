import crypto from 'crypto';
import { JWTService } from './JWTService';

export interface ClientApplication {
  id: string;
  name: string;
  apiKey: string; // hashed
  apiKeyPlaintext?: string; // shown once at creation
  tier: 'FREE' | 'STANDARD' | 'ENTERPRISE';
  quotaPerMinute: number;
  roles: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  createdBy?: string;
  lastUsedAt?: Date;
}

export interface CreateClientRequest {
  name: string;
  tier: 'FREE' | 'STANDARD' | 'ENTERPRISE';
  createdBy?: string;
}

export class APIKeyService {
  private jwtService: JWTService;
  private clients: Map<string, ClientApplication> = new Map();

  constructor(jwtService: JWTService) {
    this.jwtService = jwtService;
  }

  /**
   * Create new client application with API key
   */
  createClient(request: CreateClientRequest): ClientApplication {
    const clientId = crypto.randomUUID();
    const apiKeyPlaintext = this.generateAPIKey();
    const apiKeyHash = this.hashAPIKey(apiKeyPlaintext);
    
    const tierConfig = this.getTierConfig(request.tier);
    
    const client: ClientApplication = {
      id: clientId,
      name: request.name,
      apiKey: apiKeyHash,
      apiKeyPlaintext, // Store temporarily for display
      tier: request.tier,
      quotaPerMinute: tierConfig.quotaPerMinute,
      roles: tierConfig.roles,
      status: 'ACTIVE',
      createdAt: new Date(),
      createdBy: request.createdBy,
    };

    this.clients.set(clientId, client);
    
    // Return client with plaintext key for display
    return { ...client };
  }

  /**
   * Authenticate client using API key
   */
  authenticateClient(apiKey: string): ClientApplication | null {
    const apiKeyHash = this.hashAPIKey(apiKey);
    
    for (const client of this.clients.values()) {
      if (client.apiKey === apiKeyHash && client.status === 'ACTIVE') {
        // Update last used timestamp
        client.lastUsedAt = new Date();
        return client;
      }
    }
    
    return null;
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientApplication | null {
    const client = this.clients.get(clientId);
    return client ? { ...client } : null;
  }

  /**
   * Generate JWT tokens for authenticated client
   */
  generateTokens(client: ClientApplication): { accessToken: string; refreshToken: string } {
    return this.jwtService.generateTokenPair(
      client.id,
      client.roles,
      client.quotaPerMinute
    );
  }

  /**
   * Update client status
   */
  updateClientStatus(clientId: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    
    client.status = status;
    return true;
  }

  /**
   * Update client quota
   */
  updateClientQuota(clientId: string, quotaPerMinute: number): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    
    client.quotaPerMinute = quotaPerMinute;
    return true;
  }

  /**
   * List all clients
   */
  listClients(): ClientApplication[] {
    return Array.from(this.clients.values()).map(client => ({ ...client }));
  }

  /**
   * Delete client (soft delete by suspending)
   */
  deleteClient(clientId: string): boolean {
    return this.updateClientStatus(clientId, 'SUSPENDED');
  }

  /**
   * Generate secure API key
   */
  private generateAPIKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash API key for storage
   */
  private hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Get tier configuration
   */
  private getTierConfig(tier: 'FREE' | 'STANDARD' | 'ENTERPRISE'): {
    quotaPerMinute: number;
    roles: string[];
  } {
    switch (tier) {
      case 'FREE':
        return {
          quotaPerMinute: 100,
          roles: ['READ'],
        };
      case 'STANDARD':
        return {
          quotaPerMinute: 1000,
          roles: ['READ'],
        };
      case 'ENTERPRISE':
        return {
          quotaPerMinute: 10000,
          roles: ['READ', 'WRITE', 'ADMIN'],
        };
      default:
        throw new Error(`Invalid tier: ${tier}`);
    }
  }
}
