import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/auth/JWTService';
import { APIKeyService } from '../services/auth/APIKeyService';
import { AuthenticationError, AuthorizationError } from '../types/api';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    quotaPerMinute: number;
  };
}

export class AuthenticationMiddleware {
  private jwtService: JWTService;
  private apiKeyService: APIKeyService;

  constructor() {
    this.jwtService = new JWTService();
    this.apiKeyService = new APIKeyService(this.jwtService);
  }

  /**
   * Extract and verify JWT token from Authorization header
   */
  extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify JWT token and extract user information
   */
  verifyToken(token: string) {
    try {
      const payload = this.jwtService.verifyToken(token);
      return {
        id: payload.sub,
        roles: payload.roles,
        quotaPerMinute: payload.quotaPerMinute,
      };
    } catch (error) {
      throw new AuthenticationError(
        error instanceof Error ? error.message : 'Token verification failed',
        'INVALID_TOKEN'
      );
    }
  }

  /**
   * Express middleware for JWT authentication
   */
  authenticate() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          throw new AuthenticationError('Authentication required', 'UNAUTHENTICATED');
        }

        const user = this.verifyToken(token);
        req.user = user;
        
        next();
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return res.status(401).json({
            errors: [error],
          });
        }
        
        next(error);
      }
    };
  }

  /**
   * Express middleware for optional authentication
   */
  optionalAuthenticate() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);
        
        if (token) {
          const user = this.verifyToken(token);
          req.user = user;
        }
        
        next();
      } catch (error) {
        // For optional auth, we don't fail on invalid tokens
        next();
      }
    };
  }

  /**
   * Check if user has required role
   */
  requireRole(role: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          errors: [new AuthenticationError('Authentication required', 'UNAUTHENTICATED')],
        });
      }

      if (!req.user.roles.includes(role)) {
        return res.status(403).json({
          errors: [new AuthorizationError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', role)],
        });
      }

      next();
    };
  }

  /**
   * Check if user has any of the required roles
   */
  requireAnyRole(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          errors: [new AuthenticationError('Authentication required', 'UNAUTHENTICATED')],
        });
      }

      const hasRole = roles.some(role => req.user!.roles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({
          errors: [new AuthorizationError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')],
        });
      }

      next();
    };
  }

  /**
   * GraphQL context middleware
   */
  createGraphQLContext() {
    return async ({ req }: { req: AuthenticatedRequest }) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          return {
            user: null,
            isAuthenticated: false,
          };
        }

        const user = this.verifyToken(token);
        
        return {
          user,
          isAuthenticated: true,
        };
      } catch (error) {
        return {
          user: null,
          isAuthenticated: false,
          authError: error instanceof Error ? error.message : 'Authentication failed',
        };
      }
    };
  }

  /**
   * Generate tokens for client
   */
  async generateTokensForClient(apiKey: string) {
    const client = this.apiKeyService.authenticateClient(apiKey);
    
    if (!client) {
      throw new AuthenticationError('Invalid API key', 'INVALID_API_KEY');
    }

    return this.apiKeyService.generateTokens(client);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verifyToken(refreshToken);
      
      // Generate new access token
      const newAccessToken = this.jwtService.refreshAccessToken(refreshToken);
      
      return {
        accessToken: newAccessToken,
        refreshToken, // Keep the same refresh token
      };
    } catch (error) {
      throw new AuthenticationError(
        error instanceof Error ? error.message : 'Token refresh failed',
        'INVALID_REFRESH_TOKEN'
      );
    }
  }

  /**
   * Get public key for JWT verification
   */
  getPublicKey() {
    return this.jwtService.getPublicKey();
  }

  /**
   * Health check endpoint (no authentication required)
   */
  healthCheck() {
    return (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'flux-sight-api',
        version: '1.0.0',
      });
    };
  }

  /**
   * JWKS endpoint for JWT verification
   */
  jwksEndpoint() {
    return (req: Request, res: Response) => {
      const publicKey = this.getPublicKey();
      
      res.json({
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'flux-sight-key-1',
            alg: 'RS256',
            n: this.extractModulus(publicKey),
            e: 'AQAB',
          },
        ],
      });
    };
  }

  /**
   * Extract modulus from public key for JWKS
   */
  private extractModulus(publicKey: string): string {
    // This is a simplified implementation
    // In production, you'd use a proper crypto library to extract the modulus
    const key = publicKey.replace(/-----BEGIN PUBLIC KEY-----/, '')
                        .replace(/-----END PUBLIC KEY-----/, '')
                        .replace(/\s/g, '');
    
    return key;
  }
}
