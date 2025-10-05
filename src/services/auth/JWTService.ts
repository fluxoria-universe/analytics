import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export interface JWTPayload {
  sub: string; // client ID
  roles: string[];
  quotaPerMinute: number;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private privateKey: string;
  private publicKey: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.privateKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'private.pem'),
      'utf8'
    );
    this.publicKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'public.pem'),
      'utf8'
    );
    this.accessTokenExpiry = process.env['JWT_ACCESS_TOKEN_EXPIRY'] || '15m';
    this.refreshTokenExpiry = process.env['JWT_REFRESH_TOKEN_EXPIRY'] || '7d';
  }

  /**
   * Generate access and refresh token pair for a client
   */
  generateTokenPair(clientId: string, roles: string[], quotaPerMinute: number): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    
    const accessTokenPayload: JWTPayload = {
      sub: clientId,
      roles,
      quotaPerMinute,
      iat: now,
      exp: now + this.parseExpiry(this.accessTokenExpiry),
    };

    const refreshTokenPayload: JWTPayload = {
      sub: clientId,
      roles,
      quotaPerMinute,
      iat: now,
      exp: now + this.parseExpiry(this.refreshTokenExpiry),
    };

    const accessToken = jwt.sign(accessTokenPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.refreshTokenExpiry,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyToken(refreshToken);
    
    // Generate new access token with same client info
    const now = Math.floor(Date.now() / 1000);
    const accessTokenPayload: JWTPayload = {
      sub: payload.sub,
      roles: payload.roles,
      quotaPerMinute: payload.quotaPerMinute,
      iat: now,
      exp: now + this.parseExpiry(this.accessTokenExpiry),
    };

    return jwt.sign(accessTokenPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Get public key for token verification
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Check if user has required role
   */
  hasRole(payload: JWTPayload, requiredRole: string): boolean {
    return payload.roles.includes(requiredRole);
  }

  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(payload: JWTPayload, requiredRoles: string[]): boolean {
    return requiredRoles.some(role => payload.roles.includes(role));
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error(`Invalid expiry unit: ${unit}`);
    }
  }
}
