import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('TVL Queries', () => {
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

  describe('aggregateTVL query', () => {
    it('should get aggregate TVL across all pools', async () => {
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

    it('should get aggregate TVL at specific timestamp', async () => {
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
  });

  describe('tvlHistory field on Pool', () => {
    it('should get TVL history for a pool', async () => {
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
                nextCursor
                hasNextPage
                totalCount
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
      expect(result.data.pool.tvlHistory.pageInfo).toBeDefined();
    });

    it('should get current TVL snapshot for a pool', async () => {
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

    it('should filter TVL history by time range', async () => {
      const query = gql`
        query GetPoolTVLHistory($id: ID!, $timeRange: TimeRangeInput, $page: PageInput) {
          pool(id: $id) {
            id
            tvlHistory(timeRange: $timeRange, page: $page) {
              items {
                id
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
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.tvlHistory).toBeDefined();
      // All returned TVL records should be within the time range
      result.data.pool.tvlHistory.items.forEach((record: any) => {
        const recordTime = new Date(record.computedAt);
        expect(recordTime.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
        expect(recordTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });
  });
});
