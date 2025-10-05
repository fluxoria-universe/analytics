# Data Model: Flux-sight

**Date**: 2025-10-04  
**Purpose**: Define database entities, relationships, and validation rules for DEX event indexing

## Entity Definitions

### 1. DEXContract

**Purpose**: Configuration record for DEX smart contracts to be indexed

**Fields**:
- `id` (String, PK): Unique identifier (contract address)
- `address` (String, NOT NULL, UNIQUE): Ethereum contract address (checksummed)
- `chainId` (Int, NOT NULL): Blockchain network identifier (1 for mainnet)
- `name` (String, NULLABLE): Human-readable name (e.g., "Uniswap V3 USDC/ETH 0.3%")
- `protocol` (Enum, NOT NULL): DEX protocol type (UNISWAP_V2, UNISWAP_V3, UNISWAP_V4, SUSHISWAP)
- `startBlock` (BigInt, NOT NULL): Block number to begin indexing from
- `status` (Enum, NOT NULL): Indexing status (PENDING, ACTIVE, PAUSED, ERROR)
- `configuredAt` (Timestamp, NOT NULL): When contract was added to system
- `lastIndexedBlock` (BigInt, NULLABLE): Most recent block processed
- `createdBy` (String, NULLABLE): Admin user who configured (for audit)

**Validation Rules**:
- `address` must be valid Ethereum address (0x + 40 hex chars)
- `chainId` must match configured blockchain network
- `startBlock` must be >= contract deployment block
- `status` transitions: PENDING → ACTIVE → PAUSED ↔ ACTIVE or ERROR

**Indexes**:
- Primary: `id`
- Secondary: `status, chainId` (for active contract lookups)

**Relationships**:
- One-to-many with `Pool`

---

### 2. Pool

**Purpose**: Liquidity pool discovered from PoolCreated events

**Fields**:
- `id` (String, PK): Pool identifier (pool contract address)
- `dexContractId` (String, FK → DEXContract, NOT NULL): Parent DEX contract
- `tokenA` (String, NOT NULL): First token address (checksummed)
- `tokenB` (String, NOT NULL): Second token address (checksummed)
- `feeTier` (Int, NOT NULL): Pool fee in basis points (e.g., 3000 = 0.3%)
- `tickSpacing` (Int, NULLABLE): Tick spacing for concentrated liquidity (Uniswap V3)
- `blockNumber` (BigInt, NOT NULL): Block when pool was created
- `blockHash` (String, NOT NULL): Block hash for reorg validation
- `timestamp` (Timestamp, NOT NULL): Pool creation time (UTC)
- `transactionHash` (String, NOT NULL): Transaction that created pool

**Validation Rules**:
- `tokenA` < `tokenB` (alphabetically sorted for consistency)
- `feeTier` in allowed set (100, 500, 3000, 10000 for Uniswap V3)
- `blockNumber` >= parent DEXContract `startBlock`

**Indexes**:
- Primary: `id`
- Secondary: `dexContractId, timestamp` (for recent pool queries)
- Composite: `tokenA, tokenB, feeTier` (for pool lookup by tokens)

**Relationships**:
- Many-to-one with `DEXContract`
- One-to-many with `InitializeEvent`, `SwapEvent`, `ModifyPositionEvent`, `CollectEvent`
- One-to-many with `TVLRecord`

---

### 3. InitializeEvent

**Purpose**: Pool initialization event recording starting price

**Fields**:
- `id` (String, PK): Event identifier (txHash + logIndex)
- `poolId` (String, FK → Pool, NOT NULL): Pool being initialized
- `sqrtPriceX96` (String, NOT NULL): Starting price as Q96 fixed-point (Uniswap V3 format)
- `tick` (Int, NOT NULL): Starting tick for concentrated liquidity
- `blockNumber` (BigInt, NOT NULL): Block of initialization
- `blockHash` (String, NOT NULL): Block hash for reorg validation
- `timestamp` (Timestamp, NOT NULL): Initialization time (UTC)
- `transactionHash` (String, NOT NULL): Transaction hash
- `logIndex` (Int, NOT NULL): Log position in transaction

**Validation Rules**:
- One initialization per pool (enforced at application layer)
- `blockNumber` >= Pool `blockNumber`
- `sqrtPriceX96` must be > 0

**Indexes**:
- Primary: `id`
- Secondary: `poolId` (only one record expected)
- Composite: `blockNumber, logIndex` (for event ordering)

**Relationships**:
- Many-to-one with `Pool`

---

### 4. SwapEvent

**Purpose**: Trade execution records with price and volume

**Fields**:
- `id` (String, PK): Event identifier (txHash + logIndex)
- `poolId` (String, FK → Pool, NOT NULL): Pool where swap occurred
- `sender` (String, NOT NULL): Address initiating swap
- `recipient` (String, NOT NULL): Address receiving output tokens
- `amount0` (String, NOT NULL): Token0 amount delta (positive = in, negative = out)
- `amount1` (String, NOT NULL): Token1 amount delta
- `sqrtPriceX96` (String, NOT NULL): Price after swap (Q96 fixed-point)
- `liquidity` (String, NOT NULL): Active liquidity at this tick
- `tick` (Int, NOT NULL): Current tick after swap
- `blockNumber` (BigInt, NOT NULL): Block of swap
- `blockHash` (String, NOT NULL): Block hash for reorg validation
- `timestamp` (Timestamp, NOT NULL, HYPERTABLE): Swap execution time (UTC)
- `transactionHash` (String, NOT NULL): Transaction hash
- `logIndex` (Int, NOT NULL): Log position in transaction

**Derived Fields** (computed at query time or cached):
- `priceTokenA`: Human-readable price (derived from sqrtPriceX96)
- `volumeUSD`: Trade volume in USD (requires price oracle)

**Validation Rules**:
- `amount0` and `amount1` cannot both be zero
- `blockNumber` >= Pool initialization block

**Indexes**:
- Primary: `id`
- Hypertable: Partitioned by `timestamp` (TimescaleDB)
- Secondary: `poolId, timestamp DESC` (for recent swaps)
- Composite: `blockNumber, logIndex` (for event ordering)

**Relationships**:
- Many-to-one with `Pool`

**Notes**:
- High-volume table (millions of records), use TimescaleDB hypertable
- Automatic compression after 90 days
- Partition by month, retain 7 years

---

### 5. ModifyPositionEvent

**Purpose**: Liquidity provision and removal tracking

**Fields**:
- `id` (String, PK): Event identifier (txHash + logIndex)
- `poolId` (String, FK → Pool, NOT NULL): Pool where position modified
- `owner` (String, NOT NULL): Position owner address
- `tickLower` (Int, NOT NULL): Lower tick bound of position
- `tickUpper` (Int, NOT NULL): Upper tick bound of position
- `liquidityDelta` (String, NOT NULL): Liquidity change (positive = add, negative = remove)
- `amount0` (String, NOT NULL): Token0 amount deposited/withdrawn
- `amount1` (String, NOT NULL): Token1 amount deposited/withdrawn
- `blockNumber` (BigInt, NOT NULL): Block of position modification
- `blockHash` (String, NOT NULL): Block hash for reorg validation
- `timestamp` (Timestamp, NOT NULL, HYPERTABLE): Modification time (UTC)
- `transactionHash` (String, NOT NULL): Transaction hash
- `logIndex` (Int, NOT NULL): Log position in transaction

**Validation Rules**:
- `tickLower` < `tickUpper`
- `liquidityDelta` != 0

**Indexes**:
- Primary: `id`
- Hypertable: Partitioned by `timestamp`
- Secondary: `poolId, timestamp DESC`
- Composite: `owner, poolId` (for user position tracking)

**Relationships**:
- Many-to-one with `Pool`

---

### 6. CollectEvent

**Purpose**: Fee and liquidity withdrawal tracking for TVL calculation

**Fields**:
- `id` (String, PK): Event identifier (txHash + logIndex)
- `poolId` (String, FK → Pool, NOT NULL): Pool where fees collected
- `owner` (String, NOT NULL): Position owner address
- `recipient` (String, NOT NULL): Address receiving collected amounts
- `tickLower` (Int, NOT NULL): Lower tick of position
- `tickUpper` (Int, NOT NULL): Upper tick of position
- `amount0` (String, NOT NULL): Token0 amount collected
- `amount1` (String, NOT NULL): Token1 amount collected
- `blockNumber` (BigInt, NOT NULL): Block of collection
- `blockHash` (String, NOT NULL): Block hash for reorg validation
- `timestamp` (Timestamp, NOT NULL, HYPERTABLE): Collection time (UTC)
- `transactionHash` (String, NOT NULL): Transaction hash
- `logIndex` (Int, NOT NULL): Log position in transaction

**Validation Rules**:
- At least one of `amount0` or `amount1` must be > 0

**Indexes**:
- Primary: `id`
- Hypertable: Partitioned by `timestamp`
- Secondary: `poolId, timestamp DESC`
- Composite: `owner, poolId` (for user withdrawal tracking)

**Relationships**:
- Many-to-one with `Pool`

---

### 7. TVLRecord

**Purpose**: Pre-computed Total Value Locked metrics per pool over time

**Fields**:
- `id` (String, PK): Record identifier (poolId + computedAt timestamp)
- `poolId` (String, FK → Pool, NOT NULL): Pool being measured
- `tvlToken0` (String, NOT NULL): Total liquidity of token0
- `tvlToken1` (String, NOT NULL): Total liquidity of token1
- `tvlUSD` (String, NULLABLE): Total value in USD (requires price oracle)
- `liquidityDelta` (String, NOT NULL): Change since last record
- `computedAt` (Timestamp, NOT NULL, HYPERTABLE): Snapshot time (UTC)
- `blockNumber` (BigInt, NOT NULL): Block at snapshot time

**Validation Rules**:
- Computed every N blocks or on significant liquidity change (>1%)
- `tvlToken0` and `tvlToken1` >= 0

**Indexes**:
- Primary: `id`
- Hypertable: Partitioned by `computedAt`
- Secondary: `poolId, computedAt DESC` (for time-series queries)

**Relationships**:
- Many-to-one with `Pool`

**Computation Logic**:
```
TVL = Σ(active liquidity in all positions within current tick range)
Delta = TVL_current - TVL_previous
```

---

### 8. ClientApplication

**Purpose**: API client configuration and quota management

**Fields**:
- `id` (String, PK): Client identifier (UUID)
- `name` (String, NOT NULL): Display name
- `apiKey` (String, NOT NULL, UNIQUE): Long-lived API key (hashed SHA-256)
- `apiKeyPlaintext` (String, NULLABLE): Shown once at creation, then nulled
- `tier` (Enum, NOT NULL): Subscription tier (FREE, STANDARD, ENTERPRISE)
- `quotaPerMinute` (Int, NOT NULL): Request limit (100, 1000, 10000)
- `roles` (String[], NOT NULL): Permission roles (READ, WRITE, ADMIN)
- `status` (Enum, NOT NULL): Account status (ACTIVE, SUSPENDED)
- `createdAt` (Timestamp, NOT NULL): Client creation time
- `createdBy` (String, NULLABLE): Admin who provisioned client
- `lastUsedAt` (Timestamp, NULLABLE): Most recent API call

**Validation Rules**:
- `apiKey` must be securely generated (32 bytes random, hex-encoded)
- `quotaPerMinute` matches tier: FREE=100, STANDARD=1000, ENTERPRISE=10000
- `roles` must contain at least READ

**Indexes**:
- Primary: `id`
- Secondary: `apiKey` (for auth middleware lookup)
- Composite: `status, tier` (for active client reporting)

**Relationships**:
- None (authentication entity)

**Security Notes**:
- Store `apiKey` as SHA-256 hash
- `apiKeyPlaintext` displayed once, then set to NULL
- JWT tokens generated from `id`, `roles`, `quotaPerMinute`

---

## Entity Relationship Diagram

```
DEXContract (1) ──────< (∞) Pool
                          │
                          ├──< (1) InitializeEvent
                          │
                          ├──< (∞) SwapEvent
                          │
                          ├──< (∞) ModifyPositionEvent
                          │
                          ├──< (∞) CollectEvent
                          │
                          └──< (∞) TVLRecord

ClientApplication (auth entity, no FK relationships)
```

## Database Schema Considerations

### TimescaleDB Hypertables

Convert these high-volume tables to hypertables:
- `SwapEvent` (partitioned by `timestamp`, chunk interval: 1 month)
- `ModifyPositionEvent` (partitioned by `timestamp`, chunk interval: 1 month)
- `CollectEvent` (partitioned by `timestamp`, chunk interval: 1 month)
- `TVLRecord` (partitioned by `computedAt`, chunk interval: 1 day)

### Continuous Aggregates

Pre-compute common aggregations:
```sql
-- Hourly swap volume per pool
CREATE MATERIALIZED VIEW swap_volume_hourly
WITH (timescaledb.continuous) AS
SELECT
  poolId,
  time_bucket('1 hour', timestamp) AS hour,
  COUNT(*) as swap_count,
  SUM(ABS(amount0::numeric)) as volume_token0,
  SUM(ABS(amount1::numeric)) as volume_token1
FROM SwapEvent
GROUP BY poolId, hour;
```

### Compression Policy

```sql
-- Compress chunks older than 90 days
SELECT add_compression_policy('SwapEvent', INTERVAL '90 days');
SELECT add_compression_policy('ModifyPositionEvent', INTERVAL '90 days');
SELECT add_compression_policy('CollectEvent', INTERVAL '90 days');
```

### Retention Policy

```sql
-- Drop partitions older than 7 years
SELECT add_retention_policy('SwapEvent', INTERVAL '7 years');
SELECT add_retention_policy('ModifyPositionEvent', INTERVAL '7 years');
SELECT add_retention_policy('CollectEvent', INTERVAL '7 years');
```

## Ponder Schema Mapping

Ponder uses `ponder.schema.ts` for type-safe schema definition:

```typescript
import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
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
  }),
  
  SwapEvent: p.createTable({
    id: p.string(),
    poolId: p.string().references("Pool.id"),
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
    poolIdTimestampIndex: p.index(["poolId", "timestamp"]),
  }),
  
  // ... other tables
}));
```

## Next Steps

Data model complete. Ready to generate GraphQL schema contracts in Phase 1.

