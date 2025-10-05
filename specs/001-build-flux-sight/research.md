# Research: Flux-sight Technical Decisions

**Date**: 2025-10-04  
**Purpose**: Resolve NEEDS CLARIFICATION markers from spec.md and establish technical foundation

## Research Questions Resolved

### 1. Authentication Method and Roles

**Decision**: JWT (RS256) with API Key provisioning

**Rationale**:
- JWT with RS256 provides strong asymmetric cryptography suitable for distributed systems
- API keys serve as long-lived credentials for client application identification
- Refresh token rotation provides security without frequent re-authentication
- RBAC (Role-Based Access Control) enables fine-grained permissions (read-only, admin, operator)

**Alternatives Considered**:
- OAuth 2.0: Too complex for API-to-API communication, better suited for user-facing auth
- Basic Auth: Insufficient security for production blockchain data API
- API Key only: No token expiration mechanism, higher security risk

**Implementation Approach**:
- Clients receive API keys through admin provisioning
- API keys exchange for short-lived JWT access tokens (15min) + refresh tokens (7 days)
- Tokens include claims: clientId, roles, quotas
- Rate limiting enforced at middleware layer based on clientId from JWT

### 2. Start Block/Time for Indexing

**Decision**: Configurable per DEX contract with default to contract deployment block

**Rationale**:
- Different DEX contracts deployed at different times
- Operator may want partial historical indexing to reduce sync time
- Ponder.sh supports `startBlock` in contract configuration
- Latest block option (`"latest"`) enables real-time-only indexing for development

**Alternatives Considered**:
- Genesis block: Unnecessary for most DEXs, wastes resources
- Fixed recent block: Inflexible, misses early liquidity events
- No configuration: Forces full historical sync always

**Implementation Approach**:
```typescript
// In ponder.config.ts
contracts: {
  UniswapV3Pool: {
    address: process.env.DEX_CONTRACT_ADDRESS,
    startBlock: parseInt(process.env.START_BLOCK || "12369621"), // Uniswap V3 deployment
  }
}
```

### 3. Chain Reorganization (Reorg) Depth Handling

**Decision**: Support up to 64 blocks reorg depth (Ethereum mainnet standard)

**Rationale**:
- Ethereum mainnet probabilistic finality: 64 blocks (~13 minutes) considered safe
- Ponder.sh automatically handles reorgs by detecting chain tip changes
- Events beyond reorg depth treated as finalized
- Longer reorgs are network-level emergencies requiring manual intervention

**Alternatives Considered**:
- 12 blocks: Too shallow, risk of data inconsistency
- 128 blocks: Excessive overhead, delays finality unnecessarily
- No reorg handling: Data corruption risk

**Implementation Approach**:
- Ponder's built-in reorg reconciliation handles detection and rollback
- Events stored with blockHash for validation
- Cached queries invalidated for affected block ranges
- Monitor logs for reorg events exceeding 32 blocks (warning threshold)

### 4. Target Throughput and Performance

**Decision**: 1000 requests/minute per client, <100ms p95 query latency

**Rationale**:
- Typical DEX has 100-500 swaps/hour during normal activity
- Query-heavy workloads (analytics dashboards) need burst capacity
- Constitution mandates <100ms p95 for GraphQL queries
- Redis caching achieves >95% hit ratio for hot pools

**Alternatives Considered**:
- Unlimited throughput: Risk of abuse, resource exhaustion
- 100 req/min: Too restrictive for real-time dashboards
- 10000 req/min: Excessive for blockchain data queries

**Implementation Approach**:
- Express rate-limit middleware: 1000 req/min per API key
- Redis caching for pools, swaps (5min TTL), TVL metrics (1min TTL)
- DataLoader batching for N+1 query prevention
- Pagination enforced (max 1000 results per page)

### 5. DEX Protocol Target

**Decision**: Uniswap V3 as primary target, extensible to other AMMs

**Rationale**:
- Uniswap V3 is the dominant DEX by TVL on Ethereum mainnet
- Well-documented event structure: PoolCreated, Initialize, Swap, ModifyPosition, Collect
- Concentrated liquidity model requires sophisticated TVL tracking
- Similar event signatures across Uniswap V2, SushiSwap, PancakeSwap enable reuse

**Alternatives Considered**:
- Uniswap V2: Simpler but less feature-rich, declining market share
- Generic DEX: Harder to model without specific protocol knowledge
- Multi-protocol v1: Scope creep, deferred to future versions

**Implementation Approach**:
- Use Uniswap V3 Pool ABI from @uniswap/v3-core
- Event signatures as interfaces for future protocol adapters
- Factory pattern for multi-DEX support in v2

### 6. Blockchain Network and Chain ID

**Decision**: Ethereum mainnet (chainId: 1) with multi-chain extensibility

**Rationale**:
- Highest DEX liquidity and activity on Ethereum mainnet
- Ponder supports multi-chain configuration
- Constitution requires explicit chain ID configuration
- L2s (Arbitrum, Optimism) can be added with minimal config changes

**Alternatives Considered**:
- Testnet only: Not production-ready
- Multi-chain v1: Complexity of cross-chain TVL aggregation
- Polygon/BSC: Lower activity, can add later

**Implementation Approach**:
```typescript
// ponder.config.ts
chains: {
  mainnet: {
    id: 1,
    rpc: process.env.ETHEREUM_RPC_URL,
    ws: process.env.ETHEREUM_WS_URL, // For real-time subscriptions
    pollingInterval: 1000, // 1 second for new blocks
  }
}
```

### 7. Data Retention Policy

**Decision**: 7-year retention with time-series partitioning

**Rationale**:
- Constitution specifies 7-year audit log retention
- Financial/tax compliance often requires 7-year records
- TimescaleDB automatic partitioning manages table size
- Cold storage (S3) for events older than 1 year

**Alternatives Considered**:
- Indefinite: Storage costs unsustainable
- 1 year: Insufficient for historical analysis
- 30 days: Defeats purpose of blockchain indexer

**Implementation Approach**:
- PostgreSQL with TimescaleDB extension
- Automatic partitioning by month on `timestamp` column
- Retention policy drops partitions older than 7 years
- Compressed chunks for data older than 90 days

### 8. Rate Limiting and Quota Policy

**Decision**: Tiered quotas based on client subscription level

**Rationale**:
- Free tier: 100 req/min, read-only queries
- Standard tier: 1000 req/min, full query access
- Enterprise tier: 10000 req/min, custom retention
- Enables monetization while preventing abuse

**Alternatives Considered**:
- Flat rate: No differentiation for power users
- Pay-per-query: Complex billing, high overhead
- Unlimited: Risk of DoS attacks

**Implementation Approach**:
- Store quota limits in client configuration table
- Middleware checks JWT claims for quota tier
- Redis tracks request counts with sliding window (1 minute)
- 429 Too Many Requests with Retry-After header

### 9. Real-time Subscriptions Scope

**Decision**: GraphQL subscriptions for new events (Phase 1), polling for updates (v1)

**Rationale**:
- WebSocket subscriptions enable push-based updates
- Ponder doesn't natively support GraphQL subscriptions yet
- Polling with short intervals (5s) acceptable for v1
- Subscription support deferred to v2 with custom WebSocket server

**Alternatives Considered**:
- No real-time: Defeats purpose of live DEX tracking
- Custom WebSocket: High complexity for v1
- Server-Sent Events: One-way only, less flexible

**Implementation Approach**:
- v1: Clients poll GraphQL API every 5 seconds for new events
- v2: Implement GraphQL subscriptions with Redis pub/sub
- Ponder indexing function publishes events to Redis channel
- Custom subscription resolver forwards to connected clients

### 10. GDPR and PII Considerations

**Decision**: No PII storage, wallet addresses are public blockchain data

**Rationale**:
- Blockchain addresses are public information, not PII under GDPR
- No user emails, names, or personal data collected
- Event data is on-chain, immutable, and publicly accessible
- Right to erasure doesn't apply to public blockchain data

**Alternatives Considered**:
- Treat addresses as PII: Legal consensus disagrees
- Anonymize addresses: Defeats indexing purpose
- EU-only deployment: Unnecessary restriction

**Implementation Approach**:
- Privacy policy clarifies no PII collection
- Audit logs capture only API access patterns (clientId, timestamp, query)
- No user-facing registration, only API key provisioning by admin

## Technology Stack Validation

### Ponder.sh Framework

**Why Chosen**:
- Purpose-built for Ethereum event indexing with reorg handling
- Built-in GraphQL server auto-generated from schema
- PostgreSQL-native with efficient bulk inserts
- Active development and documentation

**Best Practices**:
- Use `ponder.schema.ts` for type-safe database models
- Leverage indexing functions for business logic isolation
- Enable caching for RPC calls to reduce provider costs
- Deploy with Railway for managed PostgreSQL and Redis

**References**:
- https://ponder.sh/docs/get-started
- https://ponder.sh/docs/indexing/overview
- https://ponder.sh/docs/query/graphql

### PostgreSQL with TimescaleDB

**Why Chosen**:
- Time-series data (blockchain events) benefits from hypertable partitioning
- Automatic compression for old data reduces storage costs
- Continuous aggregates for pre-computed TVL metrics
- Native JSON support for flexible event metadata

**Best Practices**:
- Create hypertables for Swap, ModifyPosition, Collect (high-volume events)
- Regular tables for Pool, InitializeEvent (low-volume, frequently queried)
- Indexes on poolId, timestamp, blockNumber for fast filtering
- Connection pooling (pg-pool) with max 20 connections

**References**:
- https://docs.timescale.com/use-timescale/latest/hypertables/
- https://ponder.sh/docs/database

### Redis Caching Strategy

**Why Chosen**:
- Sub-millisecond latency for hot queries
- LRU eviction prevents memory exhaustion
- Sorted sets for efficient time-range queries
- Pub/sub for future subscription support

**Best Practices**:
- Cache keys: `pool:{poolId}`, `swap:{poolId}:{page}`, `tvl:{poolId}`
- TTL: 5min for event queries, 1min for TVL metrics
- Cache invalidation on new blocks via Ponder indexing hooks
- Redis Cluster for horizontal scaling (v2)

**References**:
- https://redis.io/docs/manual/client-side-caching/
- Cache-aside pattern for query results

### JWT Authentication

**Why Chosen**:
- Stateless authentication enables horizontal scaling
- RS256 asymmetric keys prevent token forgery
- Standard claims (exp, iat, iss, sub) for interoperability
- Express-jwt middleware simplifies integration

**Best Practices**:
- Private key secured in environment variable (PEM format)
- Public key exposed at `/.well-known/jwks.json` for verification
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days with rotation on use
- Audience claim (`aud`) set to API domain

**References**:
- https://jwt.io/introduction
- RFC 7519 (JSON Web Tokens)

## Decisions Summary Table

| Question | Decision | Impact |
|----------|----------|--------|
| Auth method | JWT (RS256) + API Keys | Security, scalability |
| Start block | Configurable, default deployment block | Flexibility, sync time |
| Reorg depth | 64 blocks | Data consistency |
| Throughput | 1000 req/min per client | Resource planning |
| DEX protocol | Uniswap V3 | ABI, event structure |
| Blockchain | Ethereum mainnet (chainId: 1) | RPC provider, costs |
| Data retention | 7 years with partitioning | Storage, compliance |
| Rate limiting | Tiered quotas | Abuse prevention |
| Real-time | Polling v1, subscriptions v2 | Feature scope |
| GDPR/PII | No PII, addresses are public | Legal compliance |

## Next Steps

All NEEDS CLARIFICATION markers resolved. Ready for Phase 1: Design & Contracts.

