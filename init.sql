-- =============================================================================
-- FLUXORIA PREDICTION MARKET CONTRACT DATABASE SCHEMA
-- SQLite Database Initialization Script
-- =============================================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =============================================================================
-- EMERGENCY EVENTS TABLES
-- =============================================================================

-- Emergency pause events
CREATE TABLE IF NOT EXISTS emergency_paused (
    id TEXT PRIMARY KEY,
    by TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Emergency unpause events
CREATE TABLE IF NOT EXISTS emergency_unpaused (
    id TEXT PRIMARY KEY,
    by TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- INSURANCE FUND EVENTS TABLES
-- =============================================================================

-- Insurance fund deposits
CREATE TABLE IF NOT EXISTS insurance_fund_deposits (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    newTotal INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Insurance fund withdrawals
CREATE TABLE IF NOT EXISTS insurance_fund_withdraws (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    newTotal INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Insurance fund fee updates
CREATE TABLE IF NOT EXISTS insurance_fund_fee_updates (
    id TEXT PRIMARY KEY,
    oldFee INTEGER NOT NULL,
    newFee INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- LIQUIDATION PARAMETER UPDATES TABLES
-- =============================================================================

-- Liquidation penalty updates
CREATE TABLE IF NOT EXISTS liquidation_penalty_updates (
    id TEXT PRIMARY KEY,
    oldPenalty INTEGER NOT NULL,
    newPenalty INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Liquidation threshold updates
CREATE TABLE IF NOT EXISTS liquidation_threshold_updates (
    id TEXT PRIMARY KEY,
    oldThreshold INTEGER NOT NULL,
    newThreshold INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Warning threshold updates
CREATE TABLE IF NOT EXISTS warning_threshold_updates (
    id TEXT PRIMARY KEY,
    oldThreshold INTEGER NOT NULL,
    newThreshold INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Minimum position size updates
CREATE TABLE IF NOT EXISTS min_position_size_updates (
    id TEXT PRIMARY KEY,
    oldSize INTEGER NOT NULL,
    newSize INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- MARKET EVENTS TABLES
-- =============================================================================

-- Market creation events
CREATE TABLE IF NOT EXISTS markets_created (
    id TEXT PRIMARY KEY,
    marketId INTEGER NOT NULL,
    question TEXT NOT NULL,
    resolutionTime INTEGER NOT NULL,
    conditionalTokensContract TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Market resolution events
CREATE TABLE IF NOT EXISTS markets_resolved (
    id TEXT PRIMARY KEY,
    marketId INTEGER NOT NULL,
    finalPrice INTEGER NOT NULL,
    totalVolume INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- POSITION EVENTS TABLES
-- =============================================================================

-- Position opening events
CREATE TABLE IF NOT EXISTS positions_opened (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    side INTEGER NOT NULL, -- enum PositionSide
    size INTEGER NOT NULL,
    collateral INTEGER NOT NULL,
    price INTEGER NOT NULL,
    leverage INTEGER NOT NULL,
    marketId INTEGER NOT NULL,
    outcome INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Position closing events
CREATE TABLE IF NOT EXISTS positions_closed (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    realizedPnl INTEGER NOT NULL,
    finalCollateral INTEGER NOT NULL,
    marketId INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Partial position closing events
CREATE TABLE IF NOT EXISTS partial_positions_closed (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    marketId INTEGER NOT NULL,
    closedAmount INTEGER NOT NULL,
    realizedPnl INTEGER NOT NULL,
    remainingSize INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Position liquidation events
CREATE TABLE IF NOT EXISTS positions_liquidated (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    marketId INTEGER NOT NULL,
    collateralLost INTEGER NOT NULL,
    liquidationPenalty INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Position health warning events
CREATE TABLE IF NOT EXISTS position_health_warnings (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    marketId INTEGER NOT NULL,
    healthPercentage INTEGER NOT NULL,
    currentPrice INTEGER NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- TRADING EVENTS TABLES
-- =============================================================================

-- Token trading events
CREATE TABLE IF NOT EXISTS tokens_traded (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    marketId INTEGER NOT NULL,
    outcome INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    isBuy INTEGER NOT NULL, -- SQLite doesn't have native boolean, using INTEGER (0/1)
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- CONTRACT STATE EVENTS TABLES
-- =============================================================================

-- Contract pause events
CREATE TABLE IF NOT EXISTS contract_paused (
    id TEXT PRIMARY KEY,
    account TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Contract unpause events
CREATE TABLE IF NOT EXISTS contract_unpaused (
    id TEXT PRIMARY KEY,
    account TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- OWNERSHIP EVENTS TABLES
-- =============================================================================

-- Ownership transfer events
CREATE TABLE IF NOT EXISTS ownership_transferred (
    id TEXT PRIMARY KEY,
    previousOwner TEXT NOT NULL,
    newOwner TEXT NOT NULL,
    blockNumber INTEGER NOT NULL,
    transactionHash TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_markets_created_marketId ON markets_created(marketId);
CREATE INDEX IF NOT EXISTS idx_markets_resolved_marketId ON markets_resolved(marketId);
CREATE INDEX IF NOT EXISTS idx_positions_opened_user ON positions_opened(user);
CREATE INDEX IF NOT EXISTS idx_positions_opened_marketId ON positions_opened(marketId);
CREATE INDEX IF NOT EXISTS idx_positions_closed_user ON positions_closed(user);
CREATE INDEX IF NOT EXISTS idx_positions_closed_marketId ON positions_closed(marketId);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_user ON tokens_traded(user);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_marketId ON tokens_traded(marketId);
CREATE INDEX IF NOT EXISTS idx_positions_liquidated_user ON positions_liquidated(user);
CREATE INDEX IF NOT EXISTS idx_position_health_warnings_user ON position_health_warnings(user);

-- Timestamp indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_markets_created_timestamp ON markets_created(timestamp);
CREATE INDEX IF NOT EXISTS idx_positions_opened_timestamp ON positions_opened(timestamp);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_timestamp ON tokens_traded(timestamp);

-- Block number indexes for blockchain queries
CREATE INDEX IF NOT EXISTS idx_markets_created_blockNumber ON markets_created(blockNumber);
CREATE INDEX IF NOT EXISTS idx_positions_opened_blockNumber ON positions_opened(blockNumber);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_blockNumber ON tokens_traded(blockNumber);

-- Transaction hash indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_markets_created_transactionHash ON markets_created(transactionHash);
CREATE INDEX IF NOT EXISTS idx_positions_opened_transactionHash ON positions_opened(transactionHash);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_transactionHash ON tokens_traded(transactionHash);

-- =============================================================================
-- VIEWS FOR COMMON ANALYTICS QUERIES
-- =============================================================================

-- Market summary view
CREATE VIEW IF NOT EXISTS market_summary AS
SELECT 
    mc.marketId,
    mc.question,
    mc.resolutionTime,
    mc.timestamp as createdAt,
    mr.finalPrice,
    mr.totalVolume,
    mr.timestamp as resolvedAt,
    CASE WHEN mr.marketId IS NOT NULL THEN 1 ELSE 0 END as isResolved
FROM markets_created mc
LEFT JOIN markets_resolved mr ON mc.marketId = mr.marketId;

-- User position summary view
CREATE VIEW IF NOT EXISTS user_position_summary AS
SELECT 
    user,
    marketId,
    COUNT(*) as totalPositions,
    SUM(size) as totalSize,
    SUM(collateral) as totalCollateral,
    AVG(leverage) as avgLeverage
FROM positions_opened
GROUP BY user, marketId;

-- Trading volume summary view
CREATE VIEW IF NOT EXISTS trading_volume_summary AS
SELECT 
    marketId,
    COUNT(*) as totalTrades,
    SUM(amount) as totalVolume,
    SUM(CASE WHEN isBuy = 1 THEN amount ELSE 0 END) as buyVolume,
    SUM(CASE WHEN isBuy = 0 THEN amount ELSE 0 END) as sellVolume
FROM tokens_traded
GROUP BY marketId;

-- Daily trading activity view
CREATE VIEW IF NOT EXISTS daily_trading_activity AS
SELECT 
    DATE(timestamp, 'unixepoch') as date,
    COUNT(*) as totalTrades,
    COUNT(DISTINCT user) as uniqueTraders,
    SUM(amount) as totalVolume
FROM tokens_traded
GROUP BY DATE(timestamp, 'unixepoch')
ORDER BY date DESC;

-- =============================================================================
-- INITIALIZATION COMPLETE
-- =============================================================================

-- Insert a record to track database initialization
CREATE TABLE IF NOT EXISTS db_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

INSERT OR REPLACE INTO db_metadata (key, value) 
VALUES ('schema_version', '1.0.0');

INSERT OR REPLACE INTO db_metadata (key, value) 
VALUES ('initialized_at', strftime('%s', 'now'));

-- Log successful initialization
SELECT 'Database schema initialized successfully' as status;
