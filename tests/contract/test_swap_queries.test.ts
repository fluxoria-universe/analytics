import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('SwapEvent Queries', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        recentSwaps: () => {
          throw new Error('RecentSwaps resolver not implemented');
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

  describe('recentSwaps query', () => {
    it('should get recent swaps across all pools', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              pool {
                id
                tokenA
                tokenB
              }
              sender
              recipient
              amount0
              amount1
              sqrtPriceX96
              price
              liquidity
              tick
              blockNumber
              timestamp
              transactionHash
            }
            pageInfo {
              nextCursor
              hasNextPage
              totalCount
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { page: { limit: 10 } },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      expect(result.data.recentSwaps.items).toBeDefined();
      expect(Array.isArray(result.data.recentSwaps.items)).toBe(true);
      expect(result.data.recentSwaps.pageInfo).toBeDefined();
    });

    it('should filter swaps by pool ID', async () => {
      const query = gql`
        query RecentSwaps($poolId: ID!, $page: PageInput) {
          recentSwaps(poolId: $poolId, page: $page) {
            items {
              id
              pool {
                id
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          poolId: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 5 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      // All returned swaps should be from the specified pool
      result.data.recentSwaps.items.forEach((swap: any) => {
        expect(swap.pool.id).toBe('0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8');
      });
    });

    it('should filter swaps by time range', async () => {
      const query = gql`
        query RecentSwaps($timeRange: TimeRangeInput, $page: PageInput) {
          recentSwaps(timeRange: $timeRange, page: $page) {
            items {
              id
              timestamp
            }
          }
        }
      `;

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await testClient.query({
        query,
        variables: {
          timeRange: {
            from: oneHourAgo.toISOString(),
            to: now.toISOString(),
          },
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      // All returned swaps should be within the time range
      result.data.recentSwaps.items.forEach((swap: any) => {
        const swapTime = new Date(swap.timestamp);
        expect(swapTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(swapTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should filter swaps by block range', async () => {
      const query = gql`
        query RecentSwaps($blockRange: BlockRangeInput, $page: PageInput) {
          recentSwaps(blockRange: $blockRange, page: $page) {
            items {
              id
              blockNumber
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          blockRange: {
            from: 18000000,
            to: 18001000,
          },
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      // All returned swaps should be within the block range
      result.data.recentSwaps.items.forEach((swap: any) => {
        const blockNumber = parseInt(swap.blockNumber);
        expect(blockNumber).toBeGreaterThanOrEqual(18000000);
        expect(blockNumber).toBeLessThanOrEqual(18001000);
      });
    });
  });
});
