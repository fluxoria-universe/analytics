// Contract-related type definitions
import { ObjectType, Field, InputType, registerEnumType } from 'type-graphql';

// @ts-nocheck

// Event helper types
@ObjectType()
export class InitializeEventArgs {
  @Field()
  sqrtPriceX96: string;

  @Field()
  tick: number;
}

@ObjectType()
export class SwapEventArgs {
  @Field()
  sender: string;

  @Field()
  recipient: string;

  @Field()
  amount0: string;

  @Field()
  amount1: string;

  @Field()
  sqrtPriceX96: string;

  @Field()
  liquidity: string;

  @Field()
  tick: number;
}

@ObjectType()
export class ModifyPositionEventArgs {
  @Field()
  owner: string;

  @Field()
  tickLower: number;

  @Field()
  tickUpper: number;

  @Field()
  liquidityDelta: string;

  @Field()
  amount0: string;

  @Field()
  amount1: string;
}

@ObjectType()
export class CollectEventArgs {
  @Field()
  owner: string;

  @Field()
  recipient: string;

  @Field()
  tickLower: number;

  @Field()
  tickUpper: number;

  @Field()
  amount0: string;

  @Field()
  amount1: string;
}

@ObjectType()
export class EventBlock {
  @Field()
  number: number;

  @Field()
  hash: string;

  @Field()
  timestamp: number;
}

@ObjectType()
export class EventTransaction {
  @Field()
  hash: string;
}

@ObjectType()
export class EventLog {
  @Field()
  logIndex: number;
}

@ObjectType()
export class DEXContract {
  @Field()
  id: string;

  @Field()
  address: string;

  @Field()
  chainId: number;

  @Field({ nullable: true })
  name?: string;

  @Field(() => DEXProtocol)
  protocol: DEXProtocol;

  @Field()
  startBlock: string;

  @Field(() => IndexingStatus)
  status: IndexingStatus;

  @Field()
  configuredAt: string;

  @Field({ nullable: true })
  lastIndexedBlock?: string;

  @Field({ nullable: true })
  createdBy?: string;
}

@ObjectType()
export class Pool {
  @Field()
  id: string;

  @Field()
  dexContractId: string;

  @Field()
  tokenA: string;

  @Field()
  tokenB: string;

  @Field()
  feeTier: number;

  @Field({ nullable: true })
  tickSpacing?: number;

  @Field()
  blockNumber: string;

  @Field()
  blockHash: string;

  @Field()
  timestamp: string;

  @Field()
  transactionHash: string;
}

@ObjectType()
export class InitializeEvent {
  @Field()
  id: string;

  @Field()
  poolId: string;

  @Field()
  sqrtPriceX96: string;

  @Field()
  tick: number;

  @Field()
  blockNumber: string;

  @Field()
  blockHash: string;

  @Field()
  timestamp: string;

  @Field()
  transactionHash: string;

  @Field()
  logIndex: number;

  @Field()
  address: string;

  @Field(() => InitializeEventArgs)
  args: InitializeEventArgs;

  @Field(() => EventBlock)
  block: EventBlock;

  @Field(() => EventTransaction)
  transaction: EventTransaction;

  @Field(() => EventLog)
  log: EventLog;
}

@ObjectType()
export class SwapEvent {
  @Field()
  id: string;

  @Field()
  poolId: string;

  @Field()
  sender: string;

  @Field()
  recipient: string;

  @Field()
  amount0: string;

  @Field()
  amount1: string;

  @Field()
  sqrtPriceX96: string;

  @Field()
  liquidity: string;

  @Field()
  tick: number;

  @Field()
  blockNumber: string;

  @Field()
  blockHash: string;

  @Field()
  timestamp: string;

  @Field()
  transactionHash: string;

  @Field()
  logIndex: number;

  @Field()
  address: string;

  @Field(() => SwapEventArgs)
  args: SwapEventArgs;

  @Field(() => EventBlock)
  block: EventBlock;

  @Field(() => EventTransaction)
  transaction: EventTransaction;

  @Field(() => EventLog)
  log: EventLog;
}

@ObjectType()
export class ModifyPositionEvent {
  @Field()
  id: string;

  @Field()
  poolId: string;

  @Field()
  owner: string;

  @Field()
  tickLower: number;

  @Field()
  tickUpper: number;

  @Field()
  liquidityDelta: string;

  @Field()
  amount0: string;

  @Field()
  amount1: string;

  @Field()
  blockNumber: string;

  @Field()
  blockHash: string;

  @Field()
  timestamp: string;

  @Field()
  transactionHash: string;

  @Field()
  logIndex: number;

  @Field()
  address: string;

  @Field(() => ModifyPositionEventArgs)
  args: ModifyPositionEventArgs;

  @Field(() => EventBlock)
  block: EventBlock;

  @Field(() => EventTransaction)
  transaction: EventTransaction;

  @Field(() => EventLog)
  log: EventLog;
}

@ObjectType()
export class CollectEvent {
  @Field()
  id: string;

  @Field()
  poolId: string;

  @Field()
  owner: string;

  @Field()
  recipient: string;

  @Field()
  tickLower: number;

  @Field()
  tickUpper: number;

  @Field()
  amount0: string;

  @Field()
  amount1: string;

  @Field()
  blockNumber: string;

  @Field()
  blockHash: string;

  @Field()
  timestamp: string;

  @Field()
  transactionHash: string;

  @Field()
  logIndex: number;

  @Field()
  address: string;

  @Field(() => CollectEventArgs)
  args: CollectEventArgs;

  @Field(() => EventBlock)
  block: EventBlock;

  @Field(() => EventTransaction)
  transaction: EventTransaction;

  @Field(() => EventLog)
  log: EventLog;
}

@ObjectType()
export class TVLRecord {
  @Field()
  id: string;

  @Field()
  poolId: string;

  @Field()
  tvlToken0: string;

  @Field()
  tvlToken1: string;

  @Field({ nullable: true })
  tvlUSD?: number;

  @Field()
  liquidityDelta: string;

  @Field()
  computedAt: string;

  @Field()
  blockNumber: string;
}

@ObjectType()
export class ClientApplication {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  apiKey: string;

  @Field({ nullable: true })
  apiKeyPlaintext?: string;

  @Field(() => ClientTier)
  tier: ClientTier;

  @Field()
  quotaPerMinute: number;

  @Field(() => [String])
  roles: string[];

  @Field(() => ClientStatus)
  status: ClientStatus;

  @Field()
  createdAt: string;

  @Field({ nullable: true })
  createdBy?: string;

  @Field({ nullable: true })
  lastUsedAt?: string;
}

// Enums
export enum DEXProtocol {
  UNISWAP_V2 = 'UNISWAP_V2',
  UNISWAP_V3 = 'UNISWAP_V3',
  SUSHISWAP = 'SUSHISWAP',
  PANCAKESWAP = 'PANCAKESWAP',
}

export enum IndexingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

export enum ClientTier {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  ENTERPRISE = 'ENTERPRISE',
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Register enums with Type-GraphQL
registerEnumType(DEXProtocol, {
  name: 'DEXProtocol',
});

registerEnumType(IndexingStatus, {
  name: 'IndexingStatus',
});

registerEnumType(ClientTier, {
  name: 'ClientTier',
});

registerEnumType(ClientStatus, {
  name: 'ClientStatus',
});

// GraphQL Connection Types
@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class PoolEdge {
  @Field(() => Pool)
  node: Pool;

  @Field()
  cursor: string;
}

@ObjectType()
export class PoolConnection {
  @Field(() => [PoolEdge])
  edges: PoolEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field()
  totalCount: number;
}

@ObjectType()
export class SwapEdge {
  @Field(() => SwapEvent)
  node: SwapEvent;

  @Field()
  cursor: string;
}

@ObjectType()
export class SwapConnection {
  @Field(() => [SwapEdge])
  edges: SwapEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field()
  totalCount: number;
}

@ObjectType()
export class ModifyPositionEdge {
  @Field(() => ModifyPositionEvent)
  node: ModifyPositionEvent;

  @Field()
  cursor: string;
}

@ObjectType()
export class ModifyPositionConnection {
  @Field(() => [ModifyPositionEdge])
  edges: ModifyPositionEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field()
  totalCount: number;
}

@ObjectType()
export class CollectEdge {
  @Field(() => CollectEvent)
  node: CollectEvent;

  @Field()
  cursor: string;
}

@ObjectType()
export class CollectConnection {
  @Field(() => [CollectEdge])
  edges: CollectEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field()
  totalCount: number;
}

@ObjectType()
export class TVLEdge {
  @Field(() => TVLRecord)
  node: TVLRecord;

  @Field()
  cursor: string;
}

@ObjectType()
export class TVLConnection {
  @Field(() => [TVLEdge])
  edges: TVLEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field()
  totalCount: number;
}

// GraphQL Input Types
@InputType()
export class PageInput {
  @Field({ nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  last?: number;

  @Field({ nullable: true })
  before?: string;
}

@InputType()
export class TimeRangeInput {
  @Field({ nullable: true })
  startTime?: string;

  @Field({ nullable: true })
  endTime?: string;
}

@InputType()
export class BlockRangeInput {
  @Field({ nullable: true })
  startBlock?: string;

  @Field({ nullable: true })
  endBlock?: string;
}

// Event types for Ponder indexing
export interface PoolCreatedEvent {
  address: string;
  args: {
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    pool: string;
  };
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: number;
  };
}

export interface InitializeEvent {
  address: string;
  args: {
    sqrtPriceX96: string;
    tick: number;
  };
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: number;
  };
}

export interface SwapEvent {
  address: string;
  args: {
    sender: string;
    recipient: string;
    amount0: string;
    amount1: string;
    sqrtPriceX96: string;
    liquidity: string;
    tick: number;
  };
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: number;
  };
}

export interface ModifyPositionEvent {
  address: string;
  args: {
    owner: string;
    tickLower: number;
    tickUpper: number;
    liquidityDelta: string;
    amount0: string;
    amount1: string;
  };
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: number;
  };
}

export interface CollectEvent {
  address: string;
  args: {
    owner: string;
    recipient: string;
    tickLower: number;
    tickUpper: number;
    amount0: string;
    amount1: string;
  };
  block: {
    number: number;
    hash: string;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
  log: {
    logIndex: number;
  };
}
