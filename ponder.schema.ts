import { createSchema } from '@ponder/core';

export default createSchema((p) => ({
  DEXContract: p.createTable({
    id: p.string(), // contract address
    address: p.string(),
    chainId: p.int(),
    name: p.string().optional(),
    protocol: p.string(),
    startBlock: p.bigint(),
    status: p.string(),
    configuredAt: p.bigint(),
    lastIndexedBlock: p.bigint().optional(),
    createdBy: p.string().optional(),
  }),

  Pool: p.createTable({
    id: p.string(), // pool address
    dexContractId: p.string(),
    tokenA: p.string(),
    tokenB: p.string(),
    feeTier: p.int(),
    tickSpacing: p.int().optional(),
    blockNumber: p.bigint(),
    blockHash: p.hex(),
    timestamp: p.bigint(),
    transactionHash: p.hex(),
  }, {
    dexContractIdTimestampIndex: p.index(['dexContractId', 'timestamp']),
    tokenPairIndex: p.index(['tokenA', 'tokenB', 'feeTier']),
  }),

  InitializeEvent: p.createTable({
    id: p.string(),
    poolId: p.string().references('Pool.id'),
    sqrtPriceX96: p.bigint(),
    tick: p.int(),
    blockNumber: p.bigint(),
    blockHash: p.hex(),
    timestamp: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),
  }, {
    poolIdIndex: p.index(['poolId']),
  }),

  SwapEvent: p.createTable({
    id: p.string(),
    poolId: p.string().references('Pool.id'),
    sender: p.hex(),
    recipient: p.hex(),
    amount0: p.bigint(),
    amount1: p.bigint(),
    sqrtPriceX96: p.bigint(),
    liquidity: p.bigint(),
    tick: p.int(),
    blockNumber: p.bigint(),
    blockHash: p.hex(),
    timestamp: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),
  }, {
    poolIdTimestampIndex: p.index(['poolId', 'timestamp']),
    blockNumberLogIndexIndex: p.index(['blockNumber', 'logIndex']),
  }),

  ModifyPositionEvent: p.createTable({
    id: p.string(),
    poolId: p.string().references('Pool.id'),
    owner: p.hex(),
    tickLower: p.int(),
    tickUpper: p.int(),
    liquidityDelta: p.bigint(),
    amount0: p.bigint(),
    amount1: p.bigint(),
    blockNumber: p.bigint(),
    blockHash: p.hex(),
    timestamp: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),
  }, {
    poolIdTimestampIndex: p.index(['poolId', 'timestamp']),
    ownerPoolIdIndex: p.index(['owner', 'poolId']),
  }),

  CollectEvent: p.createTable({
    id: p.string(),
    poolId: p.string().references('Pool.id'),
    owner: p.hex(),
    recipient: p.hex(),
    tickLower: p.int(),
    tickUpper: p.int(),
    amount0: p.bigint(),
    amount1: p.bigint(),
    blockNumber: p.bigint(),
    blockHash: p.hex(),
    timestamp: p.bigint(),
    transactionHash: p.hex(),
    logIndex: p.int(),
  }, {
    poolIdTimestampIndex: p.index(['poolId', 'timestamp']),
    ownerPoolIdIndex: p.index(['owner', 'poolId']),
  }),

  TVLRecord: p.createTable({
    id: p.string(),
    poolId: p.string().references('Pool.id'),
    tvlToken0: p.bigint(),
    tvlToken1: p.bigint(),
    tvlUSD: p.bigint().optional(),
    liquidityDelta: p.bigint(),
    computedAt: p.bigint(),
    blockNumber: p.bigint(),
  }, {
    poolIdComputedAtIndex: p.index(['poolId', 'computedAt']),
  }),

  ClientApplication: p.createTable({
    id: p.string(),
    name: p.string(),
    apiKey: p.string(),
    apiKeyPlaintext: p.string().optional(),
    tier: p.string(),
    quotaPerMinute: p.int(),
    roles: p.string(),
    status: p.string(),
    createdAt: p.bigint(),
    createdBy: p.string().optional(),
    lastUsedAt: p.bigint().optional(),
  }, {
    apiKeyIndex: p.index(['apiKey']),
    statusTierIndex: p.index(['status', 'tier']),
  }),
}));
