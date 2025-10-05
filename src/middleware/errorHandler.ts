import { Request, Response, NextFunction } from 'express';
import { APIError, ValidationError, AuthenticationError, AuthorizationError, RateLimitError } from '../types/api';

/**
 * Error handling and structured logging middleware
 */
export class ErrorHandler {
  /**
   * Express error handling middleware
   */
  static handleError() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Log error details
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Determine error type and status code
      let statusCode = 500;
      let apiError: APIError;

      if (error instanceof ValidationError) {
        statusCode = 400;
        apiError = error;
      } else if (error instanceof AuthenticationError) {
        statusCode = 401;
        apiError = error;
      } else if (error instanceof AuthorizationError) {
        statusCode = 403;
        apiError = error;
      } else if (error instanceof RateLimitError) {
        statusCode = 429;
        apiError = error;
      } else {
        // Generic server error
        statusCode = 500;
        apiError = {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }

      // Send error response
      res.status(statusCode).json({
        errors: [apiError],
        meta: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    };
  }

  /**
   * Handle GraphQL errors
   */
  static handleGraphQLError(error: any, req: Request, res: Response) {
    console.error('GraphQL Error:', {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: error.extensions,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    // Extract error details
    const apiError: APIError = {
      message: error.message || 'GraphQL execution error',
      code: error.extensions?.code || 'GRAPHQL_ERROR',
      details: error.extensions,
    };

    // Add location info if available
    if (error.locations) {
      apiError.details = {
        ...apiError.details,
        locations: error.locations,
      };
    }

    return {
      errors: [apiError],
      data: null,
    };
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error: any): APIError {
    console.error('Database Error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      timestamp: new Date().toISOString(),
    });

    // PostgreSQL error codes
    switch (error.code) {
      case '23505': // Unique violation
        return {
          message: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
          details: { constraint: error.constraint },
        };
      case '23503': // Foreign key violation
        return {
          message: 'Referenced resource not found',
          code: 'FOREIGN_KEY_VIOLATION',
          details: { constraint: error.constraint },
        };
      case '23502': // Not null violation
        return {
          message: 'Required field is missing',
          code: 'NOT_NULL_VIOLATION',
          details: { column: error.column },
        };
      case '42P01': // Undefined table
        return {
          message: 'Database table not found',
          code: 'TABLE_NOT_FOUND',
        };
      case '42703': // Undefined column
        return {
          message: 'Database column not found',
          code: 'COLUMN_NOT_FOUND',
        };
      default:
        return {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          details: { originalError: error.message },
        };
    }
  }

  /**
   * Handle Redis errors
   */
  static handleCacheError(error: any): APIError {
    console.error('Cache Error:', {
      message: error.message,
      command: error.command,
      args: error.args,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Cache operation failed',
      code: 'CACHE_ERROR',
      details: { originalError: error.message },
    };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any): AuthenticationError {
    console.error('Authentication Error:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    if (error.message.includes('expired')) {
      return {
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      };
    } else if (error.message.includes('invalid')) {
      return {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      };
    } else {
      return {
        message: 'Authentication failed',
        code: 'UNAUTHENTICATED',
      };
    }
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(retryAfter: number): RateLimitError {
    return {
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, value: any, message: string): ValidationError {
    return {
      message,
      code: 'VALIDATION_ERROR',
      field,
      value,
    };
  }

  /**
   * Handle authorization errors
   */
  static handleAuthorizationError(requiredRole?: string): AuthorizationError {
    return {
      message: requiredRole 
        ? `Insufficient permissions. Required role: ${requiredRole}`
        : 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      requiredRole,
    };
  }

  /**
   * Create structured error response
   */
  static createErrorResponse(
    errors: APIError[],
    requestId?: string,
    rateLimit?: { limit: number; remaining: number; resetTime: number }
  ) {
    return {
      errors,
      meta: {
        requestId: requestId || 'unknown',
        timestamp: new Date().toISOString(),
        rateLimit,
      },
    };
  }

  /**
   * Log error with context
   */
  static logError(error: Error, context: {
    operation?: string;
    userId?: string;
    requestId?: string;
    additionalData?: any;
  }) {
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      operation: context.operation,
      userId: context.userId,
      requestId: context.requestId,
      additionalData: context.additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException() {
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      
      // Graceful shutdown
      process.exit(1);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection() {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        timestamp: new Date().toISOString(),
      });
    });
  }
}
