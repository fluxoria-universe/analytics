# Quickstart Guide: Flux-sight Testing & Validation

**Date**: 2025-10-04  
**Purpose**: End-to-end validation scenarios for manual and automated testing

## Prerequisites

- Node.js 20.x installed
- Docker and Docker Compose running
- Ethereum mainnet RPC endpoint (Alchemy, Infura, or QuickNode)
- PostgreSQL and Redis containers running
- API key provisioned for testing

## Setup

### 1. Environment Configuration

Create `.env.local`:

```bash
# Blockchain
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/fluxsight
DATABASE_SCHEMA=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ISSUER=flux-sight-api
JWT_AUDIENCE=https://api.fluxsight.io

# Application
PORT=4000
NODE_ENV=development

# DEX Contract (Uniswap V3 Factory)
DEX_FACTORY_ADDRESS=0x1F98431c8aD98523631AE4a59f267346ea31F984
START_BLOCK=12369621

# Rate Limiting
RATE_LIMIT_FREE=100
RATE_LIMIT_STANDARD=1000
RATE_LIMIT_ENTERPRISE=10000
```

### 2. Start Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Install dependencies
npm install

# Generate RSA key pair for JWT
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Run Ponder indexing
npm run ponder:dev

# In another terminal, start GraphQL API
npm run dev
```

### 3. Provision Test API Key

```bash
# Run admin CLI to create test client
npm run admin:create-client -- \
  --name "Test Client" \
  --tier STANDARD \
  --roles READ,WRITE

# Output: API_KEY=abc123...
export TEST_API_KEY=abc123...
```

### 4. Obtain JWT Token

```bash
curl -X POST http://localhost:4000/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"$TEST_API_KEY\"}" \
  | jq -r '.accessToken'

# Output: JWT token (store in $TOKEN)
export TOKEN=eyJhbGciOiJSUzI1NiIs...
```

---

## Test Scenarios

### Scenario 1: Verify DEX Contract Configuration

**Goal**: Confirm Uniswap V3 Factory is indexed with active status

**Steps**:

1. Query configured DEX contracts:

```graphql
query GetDEXContracts {
  dexContracts(status: ACTIVE) {
    id
    address
    protocol
    status
    lastIndexedBlock
    configuredAt
  }
}
```

2. Execute with authentication:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexContracts(status: ACTIVE) { id address protocol status } }"}'
```

**Expected Result**:
- Status 200
- At least one DEX contract with `protocol: UNISWAP_V3`
- `status: ACTIVE`
- `lastIndexedBlock` >= `START_BLOCK`

**Pass Criteria**:
- ✅ Response returns within 100ms
- ✅ DEX contract address matches environment variable
- ✅ Indexing status is ACTIVE

---

### Scenario 2: Discover New Pools (PoolCreated Events)

**Goal**: Retrieve recently created liquidity pools

**Steps**:

1. Query pools created in last 30 days:

```graphql
query RecentPools {
  dexContract(address: "0x1F98431c8aD98523631AE4a59f267346ea31F984") {
    pools(page: { limit: 10 }) {
      items {
        id
        tokenA
        tokenB
        feeTier
        timestamp
        transactionHash
      }
      pageInfo {
        hasNextPage
        nextCursor
        totalCount
      }
    }
  }
}
```

2. Verify pagination:

```bash
# Get first page
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "query": "query { dexContract(address: \"0x1F98431c8aD98523631AE4a59f267346ea31F984\") { pools(page: { limit: 5 }) { items { id tokenA tokenB feeTier } pageInfo { hasNextPage nextCursor } } } }"
}
EOF

# Get second page using cursor from response
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"query { dexContract(address: \\\"0x1F98431c8aD98523631AE4a59f267346ea31F984\\\") { pools(page: { limit: 5, cursor: \\\"CURSOR_FROM_PREV_RESPONSE\\\" }) { items { id } } } }\"}"
```

**Expected Result**:
- Multiple pools returned
- Each pool has `tokenA < tokenB` (sorted)
- `feeTier` in [100, 500, 3000, 10000]
- Pagination cursor present if more results exist

**Pass Criteria**:
- ✅ At least 10 pools discovered
- ✅ Token addresses are checksummed (0x prefix, mixed case)
- ✅ Pagination works correctly across multiple pages

---

### Scenario 3: Query Pool Starting Price (Initialize Events)

**Goal**: Retrieve initialization price for a specific pool

**Steps**:

1. Get USDC/ETH 0.3% pool initialize event:

```graphql
query PoolInitialize {
  pool(id: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8") {
    id
    tokenA
    tokenB
    feeTier
    initialize {
      sqrtPriceX96
      price
      tick
      timestamp
      blockNumber
    }
  }
}
```

2. Verify price calculation:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pool(id: \"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\") { initialize { sqrtPriceX96 price tick timestamp } } }"}'
```

**Expected Result**:
- Initialize event exists
- `sqrtPriceX96` is large integer (Q96 format)
- `price` is human-readable float (derived from sqrtPriceX96)
- `tick` corresponds to price

**Pass Criteria**:
- ✅ Initialize event present for pool
- ✅ Price is reasonable (e.g., USDC/ETH ~0.0005-0.001)
- ✅ Timestamp matches pool creation time

---

### Scenario 4: Capture Swap Events (Trades with Price & Volume)

**Goal**: Query recent swaps with filtering and pagination

**Steps**:

1. Get last 24 hours of swaps for USDC/ETH pool:

```graphql
query RecentSwaps {
  pool(id: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8") {
    swaps(
      timeRange: { from: "2025-10-03T00:00:00Z", to: "2025-10-04T00:00:00Z" }
      sort: DESC
      page: { limit: 100 }
    ) {
      items {
        id
        sender
        recipient
        amount0
        amount1
        price
        liquidity
        tick
        timestamp
        volumeUSD
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
}
```

2. Test time-range filtering:

```bash
FROM=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
TO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"query { pool(id: \\\"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\\\") { swaps(timeRange: { from: \\\"$FROM\\\", to: \\\"$TO\\\" }, page: { limit: 10 }) { items { timestamp price amount0 amount1 } pageInfo { totalCount } } } }\"}"
```

**Expected Result**:
- Swaps returned in descending timestamp order
- Each swap has sender, recipient addresses
- `amount0` and `amount1` have opposite signs (one positive, one negative)
- `price` reflects post-swap state
- `volumeUSD` populated if price oracle available

**Pass Criteria**:
- ✅ Swaps filtered correctly by time range
- ✅ Response time <100ms for cached queries
- ✅ Trade amounts are non-zero
- ✅ Price matches sqrtPriceX96 calculation

---

### Scenario 5: Track Liquidity Changes (ModifyPosition Events)

**Goal**: Query liquidity added/removed for a pool

**Steps**:

1. Get position modifications for last 7 days:

```graphql
query LiquidityChanges {
  pool(id: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8") {
    positions(
      timeRange: { from: "2025-09-27T00:00:00Z" }
      page: { limit: 50 }
    ) {
      items {
        id
        owner
        tickLower
        tickUpper
        liquidityDelta
        amount0
        amount1
        timestamp
        blockNumber
      }
      pageInfo {
        totalCount
      }
    }
  }
}
```

2. Filter by specific position owner:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { positionsByOwner(owner: \"0xC36442b4a4522E871399CD717aBDD847Ab11FE88\", poolId: \"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\", page: { limit: 20 }) { items { liquidityDelta amount0 amount1 timestamp } } }"}'
```

**Expected Result**:
- Liquidity deltas are positive (adds) or negative (removes)
- `tickLower < tickUpper` for all positions
- Owner address is valid Ethereum address
- Token amounts correspond to liquidity delta

**Pass Criteria**:
- ✅ Liquidity adds and removes correctly recorded
- ✅ Owner filter works across pools
- ✅ Amounts are in wei (18-19 digit integers)

---

### Scenario 6: Track TVL Changes (Collect Events + TVL Calculation)

**Goal**: Calculate TVL changes from fee collections

**Steps**:

1. Get collect events for pool:

```graphql
query FeeCollections {
  pool(id: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8") {
    collects(
      timeRange: { from: "2025-10-01T00:00:00Z" }
      page: { limit: 50 }
    ) {
      items {
        id
        owner
        recipient
        amount0
        amount1
        tickLower
        tickUpper
        timestamp
      }
    }
  }
}
```

2. Get current TVL snapshot:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pool(id: \"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\") { currentTVL { tvlToken0 tvlToken1 tvlUSD liquidityDelta computedAt blockNumber } } }"}'
```

3. Query TVL history (time-series):

```graphql
query TVLHistory {
  pool(id: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8") {
    tvlHistory(
      timeRange: { from: "2025-09-27T00:00:00Z", to: "2025-10-04T00:00:00Z" }
      page: { limit: 100 }
    ) {
      items {
        tvlToken0
        tvlToken1
        tvlUSD
        liquidityDelta
        computedAt
        blockNumber
      }
      pageInfo {
        totalCount
      }
    }
  }
}
```

**Expected Result**:
- Collect events have positive amounts (withdrawals)
- TVL decreases after large collect events
- TVL history shows trend over time
- `liquidityDelta` reflects net change

**Pass Criteria**:
- ✅ Collect amounts are positive
- ✅ TVL calculation is accurate (within 1% of on-chain state)
- ✅ TVL history has consistent timestamps (no gaps >1 hour)

---

### Scenario 7: Authentication Required (Deny Unauthenticated Access)

**Goal**: Verify all queries require valid JWT

**Steps**:

1. Attempt query without Authorization header:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexContracts { id } }"}'
```

2. Attempt query with invalid token:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer invalid_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexContracts { id } }"}'
```

3. Attempt query with expired token:

```bash
# Use token that expired 1 hour ago
EXPIRED_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { dexContracts { id } }"}'
```

**Expected Result**:
- All unauthenticated requests return 401 Unauthorized
- Invalid token returns `{"errors": [{"message": "Invalid token"}]}`
- Expired token returns `{"errors": [{"message": "Token expired"}]}`
- Health check endpoint remains accessible without auth

**Pass Criteria**:
- ✅ 401 status for missing Authorization header
- ✅ 401 status for invalid token
- ✅ 401 status for expired token
- ✅ `/health` endpoint returns 200 without auth

---

### Scenario 8: Multi-Client Support (Concurrent Requests)

**Goal**: Verify system handles multiple concurrent clients

**Steps**:

1. Create 3 test API keys with different tiers:

```bash
# Free tier client
npm run admin:create-client -- --name "Client Free" --tier FREE --roles READ
export TOKEN_FREE=...

# Standard tier client
npm run admin:create-client -- --name "Client Standard" --tier STANDARD --roles READ
export TOKEN_STANDARD=...

# Enterprise tier client
npm run admin:create-client -- --name "Client Enterprise" --tier ENTERPRISE --roles READ,ADMIN
export TOKEN_ENTERPRISE=...
```

2. Run concurrent query load test:

```bash
# Install tool: npm install -g autocannon

# Free tier (should throttle at 100 req/min)
autocannon -c 10 -d 60 -m POST \
  -H "Authorization: Bearer $TOKEN_FREE" \
  -H "Content-Type: application/json" \
  -b '{"query":"query{health{status}}"}' \
  http://localhost:4000/graphql

# Standard tier (should throttle at 1000 req/min)
autocannon -c 50 -d 60 -m POST \
  -H "Authorization: Bearer $TOKEN_STANDARD" \
  -H "Content-Type: application/json" \
  -b '{"query":"query{health{status}}"}' \
  http://localhost:4000/graphql
```

**Expected Result**:
- Free tier throttled at 100 req/min (429 responses after limit)
- Standard tier throttled at 1000 req/min
- Enterprise tier not throttled (or at 10000 req/min)
- Each client isolated (one client hitting limit doesn't affect others)

**Pass Criteria**:
- ✅ Rate limiting enforced per client
- ✅ 429 responses include `Retry-After` header
- ✅ No performance degradation for clients under quota
- ✅ System handles 50+ concurrent connections

---

### Scenario 9: Redis Caching (Performance Validation)

**Goal**: Verify cache hit ratio and performance gains

**Steps**:

1. Query same pool twice (first cold, second cached):

```bash
# First query (cold cache)
time curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pool(id: \"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\") { swaps(page: { limit: 100 }) { items { id price } } } }"}'

# Second query (warm cache)
time curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { pool(id: \"0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8\") { swaps(page: { limit: 100 }) { items { id price } } } }"}'
```

2. Check cache hit ratio metrics:

```bash
curl http://localhost:4000/metrics | grep cache_hit_ratio
```

**Expected Result**:
- First query: 200-500ms (database query)
- Second query: <50ms (Redis cache hit)
- Cache hit ratio: >95% after warm-up period

**Pass Criteria**:
- ✅ Cached queries return in <50ms
- ✅ Cache invalidates on new blocks
- ✅ Hit ratio >95% for repeated queries

---

## Performance Benchmarks

### Query Performance Targets

| Query Type | p50 | p95 | p99 |
|------------|-----|-----|-----|
| Pool lookup | <20ms | <50ms | <100ms |
| Recent swaps (100 items) | <30ms | <80ms | <150ms |
| TVL history (7 days) | <40ms | <100ms | <200ms |
| Aggregate TVL | <10ms | <30ms | <50ms |

### Indexing Performance

- **Sync speed**: 1000+ blocks/min (historical backfill)
- **Real-time lag**: <5 seconds from block finality
- **Reorg handling**: <1 second to detect and reconcile

### Resource Utilization

- **Memory**: <512MB per instance under load
- **CPU**: <50% on 2-core VM
- **Database**: <1GB for 1M events
- **Redis**: <256MB cache memory

---

## Troubleshooting

### Indexing Not Starting

```bash
# Check Ponder logs
npm run ponder:dev -- --verbose

# Verify RPC connection
curl -X POST $ETHEREUM_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check database connection
psql $DATABASE_URL -c "SELECT version();"
```

### Authentication Errors

```bash
# Verify JWT keys exist
ls -l keys/

# Test token generation
npm run admin:test-auth -- --apiKey $TEST_API_KEY

# Check token expiry
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
```

### Cache Not Working

```bash
# Verify Redis connection
redis-cli -u $REDIS_URL ping

# Check cache keys
redis-cli -u $REDIS_URL keys "pool:*"

# Monitor cache operations
redis-cli -u $REDIS_URL monitor
```

---

## Success Criteria Summary

All scenarios must pass for quickstart validation:

- ✅ DEX contract indexed with ACTIVE status
- ✅ Pools discovered and queryable
- ✅ Initialize events captured with correct prices
- ✅ Swaps tracked with time-range filtering
- ✅ Liquidity changes recorded per pool
- ✅ TVL calculated and updated correctly
- ✅ Authentication required for all queries
- ✅ Multiple clients supported concurrently
- ✅ Redis caching improves query performance
- ✅ All queries meet performance targets (<100ms p95)

**Next Steps**: Proceed to Phase 2 (Task Generation) after quickstart validation passes.

