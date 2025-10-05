import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/api';

/**
 * Input validation and sanitization middleware
 */
export class ValidationMiddleware {
  /**
   * Validate Ethereum address format
   */
  static validateAddress(address: string): boolean {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
  }

  /**
   * Validate block number
   */
  static validateBlockNumber(blockNumber: string | number): boolean {
    const num = typeof blockNumber === 'string' ? parseInt(blockNumber) : blockNumber;
    return Number.isInteger(num) && num >= 0;
  }

  /**
   * Validate timestamp format
   */
  static validateTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Validate pagination input
   */
  static validatePagination(limit?: number, cursor?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        errors.push({
          message: 'Limit must be an integer between 1 and 1000',
          code: 'INVALID_LIMIT',
          field: 'limit',
          value: limit,
        });
      }
    }

    if (cursor !== undefined && typeof cursor !== 'string') {
      errors.push({
        message: 'Cursor must be a string',
        code: 'INVALID_CURSOR',
        field: 'cursor',
        value: cursor,
      });
    }

    return errors;
  }

  /**
   * Validate time range input
   */
  static validateTimeRange(from?: string, to?: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (from && !this.validateTimestamp(from)) {
      errors.push({
        message: 'Invalid from timestamp format',
        code: 'INVALID_TIMESTAMP',
        field: 'from',
        value: from,
      });
    }

    if (to && !this.validateTimestamp(to)) {
      errors.push({
        message: 'Invalid to timestamp format',
        code: 'INVALID_TIMESTAMP',
        field: 'to',
        value: to,
      });
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      if (fromDate >= toDate) {
        errors.push({
          message: 'From timestamp must be before to timestamp',
          code: 'INVALID_TIME_RANGE',
          field: 'timeRange',
          value: { from, to },
        });
      }
    }

    return errors;
  }

  /**
   * Validate block range input
   */
  static validateBlockRange(from: number, to?: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!this.validateBlockNumber(from)) {
      errors.push({
        message: 'Invalid from block number',
        code: 'INVALID_BLOCK_NUMBER',
        field: 'from',
        value: from,
      });
    }

    if (to !== undefined) {
      if (!this.validateBlockNumber(to)) {
        errors.push({
          message: 'Invalid to block number',
          code: 'INVALID_BLOCK_NUMBER',
          field: 'to',
          value: to,
        });
      } else if (from > to) {
        errors.push({
          message: 'From block must be less than or equal to to block',
          code: 'INVALID_BLOCK_RANGE',
          field: 'blockRange',
          value: { from, to },
        });
      }
    }

    return errors;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number): number {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    return isNaN(num) ? 0 : num;
  }

  /**
   * Validate DEX contract input
   */
  static validateDEXContractInput(data: {
    address: string;
    chainId: number;
    protocol: string;
    startBlock: string;
  }): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!this.validateAddress(data.address)) {
      errors.push({
        message: 'Invalid contract address format',
        code: 'INVALID_ADDRESS',
        field: 'address',
        value: data.address,
      });
    }

    if (!Number.isInteger(data.chainId) || data.chainId < 1) {
      errors.push({
        message: 'Chain ID must be a positive integer',
        code: 'INVALID_CHAIN_ID',
        field: 'chainId',
        value: data.chainId,
      });
    }

    const validProtocols = ['UNISWAP_V2', 'UNISWAP_V3', 'SUSHISWAP', 'PANCAKESWAP'];
    if (!validProtocols.includes(data.protocol)) {
      errors.push({
        message: `Protocol must be one of: ${validProtocols.join(', ')}`,
        code: 'INVALID_PROTOCOL',
        field: 'protocol',
        value: data.protocol,
      });
    }

    if (!this.validateBlockNumber(data.startBlock)) {
      errors.push({
        message: 'Start block must be a valid block number',
        code: 'INVALID_START_BLOCK',
        field: 'startBlock',
        value: data.startBlock,
      });
    }

    return errors;
  }

  /**
   * Express middleware for GraphQL input validation
   */
  static graphQLValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const { query, variables } = req.body;

        if (!query) {
          return res.status(400).json({
            errors: [{
              message: 'Query is required',
              code: 'MISSING_QUERY',
            }],
          });
        }

        // Basic query validation
        if (typeof query !== 'string' || query.length > 10000) {
          return res.status(400).json({
            errors: [{
              message: 'Invalid query format or too long',
              code: 'INVALID_QUERY',
            }],
          });
        }

        // Validate variables if provided
        if (variables && typeof variables !== 'object') {
          return res.status(400).json({
            errors: [{
              message: 'Variables must be an object',
              code: 'INVALID_VARIABLES',
            }],
          });
        }

        next();
      } catch (error) {
        res.status(400).json({
          errors: [{
            message: 'Invalid request format',
            code: 'INVALID_REQUEST',
          }],
        });
      }
    };
  }

  /**
   * Express middleware for REST API input validation
   */
  static restValidation(rules: {
    [key: string]: (value: any) => ValidationError[];
  }) {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors: ValidationError[] = [];

      for (const [field, validator] of Object.entries(rules)) {
        const value = req.body[field] || req.query[field] || req.params[field];
        if (value !== undefined) {
          const fieldErrors = validator(value);
          errors.push(...fieldErrors);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          errors,
        });
      }

      next();
    };
  }
}
