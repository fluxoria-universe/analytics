import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('Swap Tracking Integration', () => {
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

  describe('swap event processing', () => {
    it('should track swap events with correct data structure', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              pool {
                id
                tokenA
                tokenB
                feeTier
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
              blockHash
              timestamp
              transactionHash
              logIndex
            }
            pageInfo {
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
      expect(result.data.recentSwaps.pageInfo.totalCount).toBeGreaterThan(0);
    });

    it('should validate swap event data integrity', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              amount0
              amount1
              sqrtPriceX96
              liquidity
              tick
              blockNumber
              logIndex
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { page: { limit: 5 } },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      
      result.data.recentSwaps.items.forEach((swap: any) => {
        // At least one amount should be non-zero
        const amount0 = BigInt(swap.amount0);
        const amount1 = BigInt(swap.amount1);
        expect(amount0 !== 0n || amount1 !== 0n).toBe(true);
        
        // sqrtPriceX96 should be positive
        expect(BigInt(swap.sqrtPriceX96)).toBeGreaterThan(0n);
        
        // Block number should be positive
        expect(parseInt(swap.blockNumber)).toBeGreaterThan(0);
        
        // Log index should be non-negative
        expect(swap.logIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain chronological ordering of swaps', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              timestamp
              blockNumber
              logIndex
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { page: { limit: 20 } },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      
      const swaps = result.data.recentSwaps.items;
      
      // Swaps should be ordered by timestamp (most recent first)
      for (let i = 1; i < swaps.length; i++) {
        const current = new Date(swaps[i].timestamp);
        const previous = new Date(swaps[i - 1].timestamp);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });
  });

  describe('swap filtering and pagination', () => {
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
            pageInfo {
              totalCount
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          poolId: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      
      // All swaps should be from the specified pool
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
      
      // All swaps should be within the time range
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
      
      // All swaps should be within the block range
      result.data.recentSwaps.items.forEach((swap: any) => {
        const blockNumber = parseInt(swap.blockNumber);
        expect(blockNumber).toBeGreaterThanOrEqual(18000000);
        expect(blockNumber).toBeLessThanOrEqual(18001000);
      });
    });
  });

  describe('swap price calculation', () => {
    it('should calculate human-readable price from sqrtPriceX96', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              sqrtPriceX96
              price
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { page: { limit: 5 } },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps).toBeDefined();
      
      result.data.recentSwaps.items.forEach((swap: any) => {
        // Price should be calculated from sqrtPriceX96
        expect(typeof swap.price).toBe('number');
        expect(swap.price).toBeGreaterThan(0);
        
        // Price should be consistent with sqrtPriceX96
        const sqrtPriceX96 = BigInt(swap.sqrtPriceX96);
        const expectedPrice = Number(sqrtPriceX96) / (2 ** 96);
        expect(Math.abs(swap.price - expectedPrice)).toBeLessThan(0.0001);
      });
    });

    it('should handle zero liquidity swaps gracefully', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              liquidity
              price
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
      
      // Should handle both zero and non-zero liquidity
      result.data.recentSwaps.items.forEach((swap: any) => {
        expect(BigInt(swap.liquidity)).toBeGreaterThanOrEqual(0n);
        expect(typeof swap.price).toBe('number');
      });
    });
  });

  describe('swap volume tracking', () => {
    it('should track swap volume in both tokens', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              amount0
              amount1
              volumeUSD
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
      
      result.data.recentSwaps.items.forEach((swap: any) => {
        // At least one amount should be non-zero
        const amount0 = BigInt(swap.amount0);
        const amount1 = BigInt(swap.amount1);
        expect(amount0 !== 0n || amount1 !== 0n).toBe(true);
        
        // VolumeUSD should be calculated if price oracle is available
        if (swap.volumeUSD !== null) {
          expect(typeof swap.volumeUSD).toBe('number');
          expect(swap.volumeUSD).toBeGreaterThan(0);
        }
      });
    });
  });
});
