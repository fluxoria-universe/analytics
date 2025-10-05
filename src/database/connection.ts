import { Pool } from 'pg';
import { RedisCache } from '../services/cache/RedisCache';

export class DatabaseConnection {
  private pool: Pool;
  private cache: RedisCache;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      database: process.env['POSTGRES_DB'] || 'fluxsight',
      user: process.env['POSTGRES_USER'] || 'fluxsight',
      password: process.env['POSTGRES_PASSWORD'] || 'fluxsight_password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    this.cache = new RedisCache();
  }

  /**
   * Get PostgreSQL connection pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Get Redis cache instance
   */
  getCache(): RedisCache {
    return this.cache;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Test Redis connection
   */
  async testCacheConnection(): Promise<boolean> {
    try {
      await this.cache.connect();
      await this.cache.set('test', 'value', { ttl: 1000 });
      const value = await this.cache.get('test');
      await this.cache.delete('test');
      return value === 'value';
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  /**
   * Initialize database with TimescaleDB extension
   */
  async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      // Enable TimescaleDB extension
      await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
      
      // Create hypertables for time-series data
      await this.createHypertables(client);
      
      // Create indexes for performance
      await this.createIndexes(client);
      
      // Set up compression and retention policies
      await this.setupPolicies(client);
      
      client.release();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create TimescaleDB hypertables
   */
  private async createHypertables(client: any): Promise<void> {
    // Convert SwapEvent table to hypertable
    await client.query(`
      SELECT create_hypertable('SwapEvent', 'timestamp', 
        chunk_time_interval => INTERVAL '1 month',
        if_not_exists => TRUE
      );
    `);

    // Convert ModifyPositionEvent table to hypertable
    await client.query(`
      SELECT create_hypertable('ModifyPositionEvent', 'timestamp',
        chunk_time_interval => INTERVAL '1 month',
        if_not_exists => TRUE
      );
    `);

    // Convert CollectEvent table to hypertable
    await client.query(`
      SELECT create_hypertable('CollectEvent', 'timestamp',
        chunk_time_interval => INTERVAL '1 month',
        if_not_exists => TRUE
      );
    `);

    // Convert TVLRecord table to hypertable
    await client.query(`
      SELECT create_hypertable('TVLRecord', 'computedAt',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      );
    `);
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(client: any): Promise<void> {
    // SwapEvent indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_swapevent_pool_timestamp 
      ON SwapEvent (poolId, timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_swapevent_block_log 
      ON SwapEvent (blockNumber, logIndex);
    `);

    // ModifyPositionEvent indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modifyposition_pool_timestamp 
      ON ModifyPositionEvent (poolId, timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modifyposition_owner_pool 
      ON ModifyPositionEvent (owner, poolId);
    `);

    // CollectEvent indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collectevent_pool_timestamp 
      ON CollectEvent (poolId, timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collectevent_owner_pool 
      ON CollectEvent (owner, poolId);
    `);

    // TVLRecord indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tvlrecord_pool_computed 
      ON TVLRecord (poolId, computedAt DESC);
    `);

    // Pool indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pool_tokens_fee 
      ON Pool (tokenA, tokenB, feeTier);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pool_dex_timestamp 
      ON Pool (dexContractId, timestamp DESC);
    `);
  }

  /**
   * Set up compression and retention policies
   */
  private async setupPolicies(client: any): Promise<void> {
    // Compression policy for old data (90 days)
    await client.query(`
      SELECT add_compression_policy('SwapEvent', INTERVAL '90 days', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_compression_policy('ModifyPositionEvent', INTERVAL '90 days', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_compression_policy('CollectEvent', INTERVAL '90 days', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_compression_policy('TVLRecord', INTERVAL '90 days', if_not_exists => TRUE);
    `);

    // Retention policy for very old data (7 years)
    await client.query(`
      SELECT add_retention_policy('SwapEvent', INTERVAL '7 years', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_retention_policy('ModifyPositionEvent', INTERVAL '7 years', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_retention_policy('CollectEvent', INTERVAL '7 years', if_not_exists => TRUE);
    `);

    await client.query(`
      SELECT add_retention_policy('TVLRecord', INTERVAL '7 years', if_not_exists => TRUE);
    `);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    await this.cache.disconnect();
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    database: boolean;
    cache: boolean;
    timestamp: string;
  }> {
    const [dbHealthy, cacheHealthy] = await Promise.all([
      this.testConnection(),
      this.testCacheConnection(),
    ]);

    return {
      database: dbHealthy,
      cache: cacheHealthy,
      timestamp: new Date().toISOString(),
    };
  }
}
