// API-related type definitions

export interface PageInput {
  limit?: number;
  cursor?: string;
}

export interface PageInfo {
  nextCursor?: string;
  totalCount?: number;
  hasNextPage: boolean;
}

export interface TimeRangeInput {
  from?: string;
  to?: string;
}

export interface BlockRangeInput {
  from: number;
  to?: number;
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

// Connection types for pagination
export interface PoolConnection {
  items: Pool[];
  pageInfo: PageInfo;
}

export interface SwapConnection {
  items: SwapEvent[];
  pageInfo: PageInfo;
}

export interface ModifyPositionConnection {
  items: ModifyPositionEvent[];
  pageInfo: PageInfo;
}

export interface CollectConnection {
  items: CollectEvent[];
  pageInfo: PageInfo;
}

export interface TVLConnection {
  items: TVLRecord[];
  pageInfo: PageInfo;
}

// Health status
export interface HealthStatus {
  status: string;
  lastBlock: string;
  lagSeconds: number;
  timestamp: string;
}

// GraphQL context
export interface GraphQLContext {
  user?: {
    id: string;
    roles: string[];
    quotaPerMinute: number;
  };
  cache: any;
  db: any;
}

// Authentication
export interface AuthContext {
  clientId: string;
  roles: string[];
  quotaPerMinute: number;
  isAuthenticated: boolean;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

// Error types
export interface APIError {
  message: string;
  code: string;
  details?: any;
}

export interface ValidationError extends APIError {
  field: string;
  value: any;
}

export interface AuthenticationError extends APIError {
  code: 'UNAUTHENTICATED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED';
}

export interface AuthorizationError extends APIError {
  code: 'INSUFFICIENT_PERMISSIONS' | 'ROLE_REQUIRED';
  requiredRole?: string;
}

export interface RateLimitError extends APIError {
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number;
}

// Query filters
export interface PoolFilters {
  tokenA?: string;
  tokenB?: string;
  feeTier?: number;
  dexContractId?: string;
}

export interface SwapFilters {
  poolId?: string;
  timeRange?: TimeRangeInput;
  blockRange?: BlockRangeInput;
  sender?: string;
  recipient?: string;
}

export interface PositionFilters {
  owner?: string;
  poolId?: string;
  timeRange?: TimeRangeInput;
}

export interface CollectFilters {
  owner?: string;
  poolId?: string;
  timeRange?: TimeRangeInput;
}

export interface TVLFilters {
  poolId?: string;
  timeRange?: TimeRangeInput;
}

// Response types
export interface APIResponse<T> {
  data: T;
  errors?: APIError[];
  meta?: {
    requestId: string;
    timestamp: string;
    rateLimit?: RateLimitInfo;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

// Cache keys
export interface CacheKeys {
  pool: (poolId: string) => string;
  swaps: (poolId: string, page: number) => string;
  tvl: (poolId: string) => string;
  dexContract: (address: string) => string;
}

// Service interfaces
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}

export interface DatabaseService {
  findPool(id: string): Promise<Pool | null>;
  findPools(filters: PoolFilters, page: PageInput): Promise<PoolConnection>;
  findSwaps(filters: SwapFilters, page: PageInput): Promise<SwapConnection>;
  findPositions(filters: PositionFilters, page: PageInput): Promise<ModifyPositionConnection>;
  findCollects(filters: CollectFilters, page: PageInput): Promise<CollectConnection>;
  findTVLRecords(filters: TVLFilters, page: PageInput): Promise<TVLConnection>;
  findDEXContract(address: string): Promise<DEXContract | null>;
  findDEXContracts(status?: IndexingStatus): Promise<DEXContract[]>;
}

export interface AuthService {
  authenticateClient(apiKey: string): Promise<ClientApplication | null>;
  generateTokens(client: ClientApplication): Promise<{ accessToken: string; refreshToken: string }>;
  verifyToken(token: string): Promise<AuthContext>;
  checkRateLimit(clientId: string, quotaPerMinute: number): Promise<boolean>;
}

// Import types from contracts
import {
  DEXContract,
  Pool,
  InitializeEvent,
  SwapEvent,
  ModifyPositionEvent,
  CollectEvent,
  TVLRecord,
  ClientApplication,
  DEXProtocol,
  IndexingStatus,
  ClientTier,
  ClientStatus,
} from './contracts';
