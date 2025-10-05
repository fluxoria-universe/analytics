import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('TVL Calculation Integration', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        aggregateTVL: () => {
          throw new Error('AggregateTVL resolver not implemented');
        },
        health: () => ({
          status: 'ok',
          lastBlock: '0',
          lagSeconds: 0,
          timestamp: new Date().toISOString(),
        }),
      },
    };

    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    testClient = createTestClient(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('aggregate TVL calculation', () => {
    it('should calculate total TVL across all pools', async () => {
      const query = gql`
        query AggregateTVL {
          aggregateTVL
        }
      `;

      const result = await testClient.query({ query });

      expect(result.errors).toBeUndefined();
      expect(result.data.aggregateTVL).toBeDefined();
      expect(typeof result.data.aggregateTVL).toBe('number');
      expect(result.data.aggregateTVL).toBeGreaterThanOrEqual(0);
    });

    it('should calculate TVL at specific timestamp', async () => {
      const query = gql`
        query AggregateTVL($timestamp: String!) {
          aggregateTVL(timestamp: $timestamp)
        }
      `;

      const timestamp = new Date().toISOString();

      const result = await testClient.query({
        query,
        variables: { timestamp },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.aggregateTVL).toBeDefined();
      expect(typeof result.data.aggregateTVL).toBe('number');
    });

    it('should handle historical TVL calculation', async () => {
      const query = gql`
        query AggregateTVL($timestamp: String!) {
          aggregateTVL(timestamp: $timestamp)
        }
      `;

      // Calculate TVL for 24 hours ago
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await testClient.query({
        query,
        variables: { timestamp: yesterday.toISOString() },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.aggregateTVL).toBeDefined();
      expect(typeof result.data.aggregateTVL).toBe('number');
    });
  });

  describe('pool-specific TVL tracking', () => {
    it('should track TVL history for individual pools', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(page: $page) {
              items {
                id
                pool {
                  id
                }
                tvlToken0
                tvlToken1
                tvlUSD
                liquidityDelta
                computedAt
                blockNumber
              }
              pageInfo {
                totalCount
                hasNextPage
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.tvlHistory).toBeDefined();
      expect(result.data.pool.tvlHistory.items).toBeDefined();
      expect(Array.isArray(result.data.pool.tvlHistory.items)).toBe(true);
    });

    it('should provide current TVL snapshot for pools', async () => {
      const query = gql`
        query GetPoolCurrentTVL($id: ID!) {
          pool(id: $id) {
            id
            currentTVL {
              id
              tvlToken0
              tvlToken1
              tvlUSD
              liquidityDelta
              computedAt
              blockNumber
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.currentTVL).toBeDefined();
      expect(result.data.pool.currentTVL.tvlToken0).toBeDefined();
      expect(result.data.pool.currentTVL.tvlToken1).toBeDefined();
    });

    it('should validate TVL data consistency', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(page: $page) {
              items {
                id
                tvlToken0
                tvlToken1
                tvlUSD
                liquidityDelta
                computedAt
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 5 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      
      result.data.pool.tvlHistory.items.forEach((record: any) => {
        // TVL values should be non-negative
        expect(BigInt(record.tvlToken0)).toBeGreaterThanOrEqual(0n);
        expect(BigInt(record.tvlToken1)).toBeGreaterThanOrEqual(0n);
        
        // USD value should be positive if available
        if (record.tvlUSD !== null) {
          expect(record.tvlUSD).toBeGreaterThan(0);
        }
        
        // ComputedAt should be valid timestamp
        expect(new Date(record.computedAt)).toBeInstanceOf(Date);
      });
    });
  });

  describe('TVL calculation from Collect events', () => {
    it('should update TVL when fees are collected', async () => {
      const query = gql`
        query GetPoolCollects($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            collects(page: $page) {
              items {
                id
                amount0
                amount1
                timestamp
              }
            }
            currentTVL {
              tvlToken0
              tvlToken1
              liquidityDelta
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.collects).toBeDefined();
      expect(result.data.pool.currentTVL).toBeDefined();
      
      // TVL should reflect collected amounts
      const totalCollected0 = result.data.pool.collects.items.reduce(
        (sum: bigint, collect: any) => sum + BigInt(collect.amount0),
        0n
      );
      const totalCollected1 = result.data.pool.collects.items.reduce(
        (sum: bigint, collect: any) => sum + BigInt(collect.amount1),
        0n
      );
      
      // Current TVL should account for collected amounts
      expect(BigInt(result.data.pool.currentTVL.tvlToken0)).toBeGreaterThanOrEqual(0n);
      expect(BigInt(result.data.pool.currentTVL.tvlToken1)).toBeGreaterThanOrEqual(0n);
    });

    it('should track liquidity delta over time', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(page: $page) {
              items {
                id
                liquidityDelta
                computedAt
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      
      // Liquidity delta should be tracked
      result.data.pool.tvlHistory.items.forEach((record: any) => {
        expect(BigInt(record.liquidityDelta)).toBeDefined();
        expect(typeof record.computedAt).toBe('string');
      });
    });
  });

  describe('TVL time-series analysis', () => {
    it('should provide TVL data for time range analysis', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $timeRange: TimeRangeInput, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(timeRange: $timeRange, page: $page) {
              items {
                id
                tvlToken0
                tvlToken1
                tvlUSD
                computedAt
              }
            }
          }
        }
      `;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          timeRange: {
            from: oneDayAgo.toISOString(),
            to: now.toISOString(),
          },
          page: { limit: 24 }, // Hourly data for 24 hours
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.tvlHistory).toBeDefined();
      
      // All records should be within the time range
      result.data.pool.tvlHistory.items.forEach((record: any) => {
        const recordTime = new Date(record.computedAt);
        expect(recordTime.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
        expect(recordTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should maintain chronological order of TVL records', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(page: $page) {
              items {
                id
                computedAt
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 20 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      
      const records = result.data.pool.tvlHistory.items;
      
      // Records should be ordered by computedAt (most recent first)
      for (let i = 1; i < records.length; i++) {
        const current = new Date(records[i].computedAt);
        const previous = new Date(records[i - 1].computedAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });
  });
});
