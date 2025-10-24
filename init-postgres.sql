-- =============================================================================
-- FLUXORIA PREDICTION MARKET CONTRACT DATABASE INITIALIZATION
-- PostgreSQL Database Initialization Script
-- =============================================================================
-- 
-- This script runs BEFORE Ponder starts
-- It only creates non-conflicting database objects
-- =============================================================================

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS db_health (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'healthy',
    checked_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO db_health (status) VALUES ('initialized');

-- Log successful initialization
SELECT 'Database pre-initialization completed' as status;