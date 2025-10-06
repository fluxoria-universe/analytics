# Analytics - Uniswap V3 Flash Loan Tracker

A Ponder-based analytics application that tracks and analyzes Uniswap V3 flash loan events on Ethereum mainnet. This project monitors flash loan activities across all Uniswap V3 pools and provides both SQL and GraphQL APIs for data access.

## Features

- **Real-time Event Tracking**: Monitors Uniswap V3 flash loan events across all pools
- **Token Analytics**: Tracks borrowed and paid amounts for each token
- **Dual API Access**: Provides both SQL and GraphQL endpoints for data querying
- **Automatic Pool Discovery**: Uses Uniswap V3 Factory events to discover new pools automatically

## Project Structure

```
analytics/
├── abis/                          # Contract ABIs
│   ├── UniswapV3FactoryAbi.ts    # Uniswap V3 Factory ABI
│   └── UniswapV3PoolAbi.ts       # Uniswap V3 Pool ABI
├── generated/                     # Generated files
│   └── schema.graphql            # Generated GraphQL schema
├── node_modules/                  # Node.js dependencies
├── src/
│   ├── api/
│   │   └── index.ts              # API server configuration
│   └── index.ts                  # Main event handlers
├── package.json                   # Project dependencies and scripts
├── package-lock.json             # Lock file for dependencies
├── ponder.config.ts              # Ponder configuration
├── ponder.schema.ts              # Database schema definition
├── ponder-env.d.ts               # Ponder environment type definitions
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

## Data Model

The application tracks two main data types:

### Token Borrowed
- `address`: Token contract address (primary key)
- `amount`: Total amount borrowed (cumulative)

### Token Paid
- `address`: Token contract address (primary key)  
- `amount`: Total amount paid back (cumulative)

## Prerequisites

- Node.js >= 18.14
- Access to an Ethereum mainnet RPC endpoint

## Installation

1. Clone the repository:
```bash
git clone https://github.com/fluxoria-universe/analytics
cd analytics
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the project root:
```bash
PONDER_RPC_URL_1=your_ethereum_rpc_url_here
```

## Usage

### Development Mode
Start the development server with hot reloading:
```bash
npm run dev
```

### Production Mode
Start the production server:
```bash
npm start
```

### Database Management
Access the database CLI:
```bash
npm run db
```

### Code Generation
Generate TypeScript types and GraphQL schema:
```bash
npm run codegen
```

## API Endpoints

The application provides multiple ways to access the data:

### GraphQL API
- **Endpoint**: `/graphql` or `/`
- **Schema**: Auto-generated from your database schema
- **Query Example**:
```graphql
query {
  tokenBorrowed {
    address
    amount
  }
  tokenPaid {
    address
    amount
  }
}
```

### SQL API
- **Endpoint**: `/sql/*`
- **Usage**: Direct SQL queries against the database
- **Example**: `/sql/select * from token_borrowed`

## Configuration

### Ponder Configuration (`ponder.config.ts`)
- **Chain**: Ethereum mainnet (chain ID: 1)
- **Start Block**: 12369621 (when Uniswap V3 Factory was deployed)
- **Contract**: Monitors all Uniswap V3 pools created by the factory

### Database Schema (`ponder.schema.ts`)
Defines the onchain tables for tracking token borrows and payments.

## Event Handling

The application listens for `Flash` events from Uniswap V3 pools and:
1. Extracts token addresses (token0, token1) from the pool
2. Records borrowed amounts in the `tokenBorrowed` table
3. Records paid amounts in the `tokenPaid` table
4. Updates cumulative amounts for existing tokens

## Development

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Adding New GraphQL Schema

The GraphQL schema is automatically generated from your database schema defined in `ponder.schema.ts`. Here's how to add new tables and fields:

### Step 1: Define New Tables in Schema
Edit `ponder.schema.ts` to add new tables:

```typescript
import { onchainTable } from "ponder";

export const tokenPaid = onchainTable("token_paid", (t) => ({
  address: t.hex().primaryKey(),
  amount: t.bigint().notNull(),
}));

export const tokenBorrowed = onchainTable("token_borrowed", (t) => ({
  address: t.hex().primaryKey(),
  amount: t.bigint().notNull(),
}));

// Add your new table
export const yourNewTable = onchainTable("your_new_table", (t) => ({
  id: t.hex().primaryKey(),
  field1: t.string(),
  field2: t.bigint(),
  field3: t.boolean().notNull(),
}));
```

### Step 2: Update Event Handlers
Add event handlers in `src/index.ts` to populate your new table:

```typescript
ponder.on("YourContract:YourEvent", async ({ event, context }) => {
  await context.db
    .insert(schema.yourNewTable)
    .values({
      id: event.args.id,
      field1: event.args.field1,
      field2: event.args.field2,
      field3: event.args.field3,
    });
});
```

### Step 3: Regenerate GraphQL Schema
After making schema changes, regenerate the GraphQL schema:

```bash
npm run codegen
```

This will:
- Update the generated GraphQL schema in `generated/schema.graphql`
- Generate TypeScript types for your new tables
- Create proper GraphQL queries, mutations, and filters

### Step 4: Test Your New Schema
You can test your new GraphQL schema using the built-in GraphQL playground:

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:42069/graphql` (or your configured port)
3. Use the GraphQL playground to test queries

### Example New Table Query
After adding a new table, you can query it like this:

```graphql
query {
  yourNewTables(where: { field1: "some_value" }) {
    items {
      id
      field1
      field2
      field3
    }
    totalCount
  }
}
```

### Schema Field Types
Available field types in Ponder schema:

- `t.string()` - String values
- `t.hex()` - Hexadecimal values (addresses, hashes)
- `t.bigint()` - Large integer values
- `t.boolean()` - Boolean values
- `t.int()` - Integer values
- `t.json()` - JSON objects
- `t.text()` - Long text values

### Adding Relationships
To create relationships between tables, use foreign keys:

```typescript
export const parentTable = onchainTable("parent_table", (t) => ({
  id: t.hex().primaryKey(),
  name: t.string(),
}));

export const childTable = onchainTable("child_table", (t) => ({
  id: t.hex().primaryKey(),
  parentId: t.hex().references("parent_table", "id"),
  value: t.string(),
}));
```

## Monitoring

The application tracks flash loan activities in real-time. You can monitor:
- Total amounts borrowed per token
- Total amounts paid back per token
- Flash loan frequency and patterns
- Token-specific analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For questions or issues, please contact the development team.
