# Flux-sight

A GraphQL API application that indexes onchain data from DEX smart contracts, providing real-time analytics and insights for decentralized exchange activities.

## Features

- **Onchain Data Indexing**: Tracks events from DEX smart contracts using Ponder.sh
- **GraphQL API**: Modern, type-safe API with comprehensive queries and mutations
- **Authentication**: JWT-based authentication with API key support
- **Real-time Performance**: Redis caching and optimized queries
- **Multi-client Support**: Role-based access control for multiple clients
- **Event Tracking**: Monitors PoolCreated, Initialize, Swap, ModifyPosition, and Collect events

## Architecture

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **API Framework**: Express.js with Apollo GraphQL Server
- **Indexing**: Ponder.sh for Ethereum event indexing
- **Database**: PostgreSQL with TimescaleDB extension
- **Caching**: Redis for frequently accessed data
- **Authentication**: JWT (RS256) with API key support
- **Testing**: Jest with comprehensive test coverage

### Core Components

- **Indexing Layer**: Ponder.sh functions for event processing
- **API Layer**: GraphQL resolvers and Express middleware
- **Service Layer**: JWT, API Key, Redis Cache, and TVL Calculator services
- **Database Layer**: PostgreSQL with TimescaleDB for time-series data
- **Security Layer**: Authentication, rate limiting, and input validation

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ with TimescaleDB extension
- Redis 6+
- Docker and Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.template .env
   # Edit .env with your configuration
   ```

4. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The GraphQL API will be available at `http://localhost:4000/graphql`

## Configuration

### Environment Variables

```env
# Ethereum RPC
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
ETHEREUM_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/your-key
START_BLOCK=12369621

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fluxsight

# Redis
REDIS_URL=redis://localhost:6379

# JWT Keys (generated automatically)
JWT_PRIVATE_KEY=./jwt_private.pem
JWT_PUBLIC_KEY=./jwt_public.pem

# Server
PORT=4000
NODE_ENV=development
```

### Ponder Configuration

The application uses Ponder.sh for indexing Ethereum events. Configuration is in `ponder.config.ts`:

```typescript
export default createConfig({
  networks: {
    mainnet: {
      chainId: 1,
      rpc: process.env.ETHEREUM_RPC_URL,
      pollingInterval: 1000,
    },
  },
  contracts: {
    UniswapV3Factory: {
      network: 'mainnet',
      address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      abi: './abis/UniswapV3Factory.json',
      startBlock: parseInt(process.env.START_BLOCK || '12369621'),
    },
    // ... other contracts
  },
});
```

## API Usage

### Authentication

The API supports two authentication methods:

1. **JWT Tokens**: For web applications
   ```bash
   curl -H "Authorization: Bearer <jwt-token>" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ health { status } }"}' \
        http://localhost:4000/graphql
   ```

2. **API Keys**: For server-to-server communication
   ```bash
   curl -H "X-API-Key: <api-key>" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ health { status } }"}' \
        http://localhost:4000/graphql
   ```

### GraphQL Queries

#### Health Check
```graphql
query {
  health {
    status
    timestamp
  }
}
```

#### DEX Contracts
```graphql
query {
  dexContracts(first: 10) {
    edges {
      node {
        id
        address
        name
        isActive
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

#### Pool Data
```graphql
query {
  pools(first: 20, filter: { dexContractId: "1" }) {
    edges {
      node {
        id
        address
        token0
        token1
        fee
        tickSpacing
        createdAt
      }
    }
  }
}
```

#### Swap Events
```graphql
query {
  swapEvents(
    first: 50
    filter: { poolId: "pool-1" }
    timeRange: {
      from: "2023-01-01T00:00:00Z"
      to: "2023-01-31T23:59:59Z"
    }
  ) {
    edges {
      node {
        id
        poolId
        sender
        recipient
        amount0
        amount1
        blockNumber
        transactionHash
        timestamp
      }
    }
  }
}
```

#### TVL Data
```graphql
query {
  tvlRecords(first: 10) {
    edges {
      node {
        poolId
        totalAmount0
        totalAmount1
        calculatedAt
      }
    }
  }
}
```

## Development

### Project Structure

```
src/
├── graphql/
│   ├── schema.graphql          # GraphQL schema definition
│   └── resolvers/              # GraphQL resolvers
├── indexing/                   # Ponder.sh indexing functions
├── services/                   # Business logic services
├── middleware/                 # Express middleware
├── database/                   # Database connection and queries
├── types/                      # TypeScript type definitions
└── index.ts                    # Application entry point

tests/
├── unit/                       # Unit tests
├── integration/                # Integration tests
├── performance/                # Performance tests
└── contract/                   # Contract tests

specs/001-build-flux-sight/     # Feature specifications
├── spec.md                     # Feature specification
├── plan.md                     # Implementation plan
├── tasks.md                    # Task breakdown
├── data-model.md               # Database schema
├── contracts/                  # API contracts
└── quickstart.md               # Quick start guide
```

### Available Scripts

```bash
# Development
npm run dev                     # Start development server
npm run build                   # Build TypeScript
npm run start                   # Start production server

# Testing
npm run test                    # Run all tests
npm run test:watch              # Run tests in watch mode
npm run test:coverage           # Run tests with coverage

# Code Quality
npm run lint                    # Run ESLint
npm run lint:fix                # Fix ESLint issues
npm run format                  # Format code with Prettier

# Ponder
npm run ponder:dev              # Start Ponder development
npm run ponder:build            # Build Ponder
npm run ponder:start            # Start Ponder production

# Database
npm run db:migrate              # Run database migrations
npm run db:seed                 # Seed database with test data
```

### Testing

The project follows Test-Driven Development (TDD) principles with comprehensive test coverage:

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **Contract Tests**: Test GraphQL API contracts
- **Performance Tests**: Test system performance and scalability

Run tests:
```bash
# All tests
npm test

# Specific test suites
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration
npm test -- --testPathPattern=performance

# With coverage
npm run test:coverage
```

## Deployment

### Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t flux-sight .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Production Considerations

- Configure proper environment variables
- Set up SSL/TLS certificates
- Configure reverse proxy (nginx)
- Set up monitoring and logging
- Configure database backups
- Set up Redis persistence

## Monitoring and Observability

### Health Checks

The API provides health check endpoints:

- `GET /health` - Basic health check
- GraphQL `health` query - Detailed system status

### Metrics

Key metrics to monitor:

- API response times
- Database query performance
- Redis cache hit rates
- Indexing lag
- Error rates
- Memory usage

### Logging

The application uses structured logging with different levels:

- `ERROR`: System errors and exceptions
- `WARN`: Warning conditions
- `INFO`: General information
- `DEBUG`: Detailed debugging information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests
- Document public APIs
- Follow conventional commit messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Check the documentation in `specs/001-build-flux-sight/`
- Review the quickstart guide

## Roadmap

- [ ] WebSocket subscriptions for real-time updates
- [ ] Additional DEX protocol support
- [ ] Advanced analytics and reporting
- [ ] GraphQL federation support
- [ ] Horizontal scaling capabilities
- [ ] Advanced caching strategies
