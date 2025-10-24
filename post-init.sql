-- =============================================================================
-- FLUXORIA PREDICTION MARKET CONTRACT - POST INITIALIZATION SCRIPT
-- PostgreSQL Analytics Views and Indexes
-- =============================================================================
-- 
-- This script runs AFTER Ponder has created the tables
-- It adds performance indexes and analytics views
-- =============================================================================

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_markets_created_market_id ON markets_created(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_resolved_market_id ON markets_resolved(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_opened_user ON positions_opened("user");
CREATE INDEX IF NOT EXISTS idx_positions_opened_market_id ON positions_opened(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_closed_user ON positions_closed("user");
CREATE INDEX IF NOT EXISTS idx_positions_closed_market_id ON positions_closed(market_id);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_user ON tokens_traded("user");
CREATE INDEX IF NOT EXISTS idx_tokens_traded_market_id ON tokens_traded(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_liquidated_user ON positions_liquidated("user");
CREATE INDEX IF NOT EXISTS idx_position_health_warnings_user ON position_health_warnings("user");

-- Timestamp indexes for time-based queries (already created by Ponder)
-- CREATE INDEX IF NOT EXISTS idx_markets_created_timestamp ON markets_created(timestamp);
-- CREATE INDEX IF NOT EXISTS idx_positions_opened_timestamp ON positions_opened(timestamp);
-- CREATE INDEX IF NOT EXISTS idx_tokens_traded_timestamp ON tokens_traded(timestamp);

-- Block number indexes for blockchain queries
CREATE INDEX IF NOT EXISTS idx_markets_created_block_number ON markets_created(block_number);
CREATE INDEX IF NOT EXISTS idx_positions_opened_block_number ON positions_opened(block_number);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_block_number ON tokens_traded(block_number);

-- Transaction hash indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_markets_created_transaction_hash ON markets_created(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_positions_opened_transaction_hash ON positions_opened(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_traded_transaction_hash ON tokens_traded(transaction_hash);

-- =============================================================================
-- VIEWS FOR COMMON ANALYTICS QUERIES
-- =============================================================================

-- Market summary view
DROP VIEW IF EXISTS market_summary;
CREATE VIEW market_summary AS
SELECT 
    mc.market_id,
    mc.question,
    mc.resolution_time,
    mc.timestamp as created_at,
    mr.final_price,
    mr.total_volume,
    mr.timestamp as resolved_at,
    CASE WHEN mr.market_id IS NOT NULL THEN TRUE ELSE FALSE END as is_resolved
FROM markets_created mc
LEFT JOIN markets_resolved mr ON mc.market_id = mr.market_id;

-- User position summary view
DROP VIEW IF EXISTS user_position_summary;
CREATE VIEW user_position_summary AS
SELECT 
    "user",
    market_id,
    COUNT(*) as total_positions,
    SUM(size) as total_size,
    SUM(collateral) as total_collateral,
    AVG(leverage) as avg_leverage
FROM positions_opened
GROUP BY "user", market_id;

-- Trading volume summary view
DROP VIEW IF EXISTS trading_volume_summary;
CREATE VIEW trading_volume_summary AS
SELECT 
    market_id,
    COUNT(*) as total_trades,
    SUM(amount) as total_volume,
    SUM(CASE WHEN is_buy = TRUE THEN amount ELSE 0 END) as buy_volume,
    SUM(CASE WHEN is_buy = FALSE THEN amount ELSE 0 END) as sell_volume
FROM tokens_traded
GROUP BY market_id;

-- Daily trading activity view
DROP VIEW IF EXISTS daily_trading_activity;
CREATE VIEW daily_trading_activity AS
SELECT 
    DATE(TO_TIMESTAMP(timestamp::bigint)) as date,
    COUNT(*) as total_trades,
    COUNT(DISTINCT "user") as unique_traders,
    SUM(amount) as total_volume
FROM tokens_traded
GROUP BY DATE(TO_TIMESTAMP(timestamp::bigint))
ORDER BY date DESC;

-- =============================================================================
-- METADATA TRACKING
-- =============================================================================

-- Create metadata table for tracking initialization
CREATE TABLE IF NOT EXISTS db_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Insert metadata records
INSERT INTO db_metadata (key, value) 
VALUES ('analytics_views_version', '1.0.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO db_metadata (key, value) 
VALUES ('analytics_initialized_at', EXTRACT(EPOCH FROM NOW())::TEXT)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Log successful initialization
SELECT 'Analytics views and indexes created successfully' as status;
