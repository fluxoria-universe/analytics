import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('Pagination', () => {
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
        poolsByTokens: () => {
          throw new Error('PoolsByTokens resolver not implemented');
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

  describe('cursor-based pagination', () => {
    it('should return first page with next cursor', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              timestamp
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
      expect(result.data.recentSwaps.pageInfo.hasNextPage).toBeDefined();
      expect(typeof result.data.recentSwaps.pageInfo.hasNextPage).toBe('boolean');
    });

    it('should use cursor for subsequent pages', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              timestamp
            }
            pageInfo {
              nextCursor
              hasNextPage
              totalCount
            }
          }
        }
      `;

      // First page
      const firstPage = await testClient.query({
        query,
        variables: { page: { limit: 5 } },
      });

      expect(firstPage.errors).toBeUndefined();
      expect(firstPage.data.recentSwaps.pageInfo.nextCursor).toBeDefined();

      // Second page using cursor
      const secondPage = await testClient.query({
        query,
        variables: {
          page: {
            limit: 5,
            cursor: firstPage.data.recentSwaps.pageInfo.nextCursor,
          },
        },
      });

      expect(secondPage.errors).toBeUndefined();
      expect(secondPage.data.recentSwaps).toBeDefined();
      expect(secondPage.data.recentSwaps.items).toBeDefined();
    });

    it('should respect maximum page size', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
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
        variables: { page: { limit: 2000 } }, // Exceeds max limit of 1000
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.recentSwaps.items.length).toBeLessThanOrEqual(1000);
    });

    it('should handle empty results', async () => {
      const query = gql`
        query PoolsByTokens($tokenA: String!, $tokenB: String!) {
          poolsByTokens(tokenA: $tokenA, tokenB: $tokenB) {
            items {
              id
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
        variables: {
          tokenA: '0x0000000000000000000000000000000000000000',
          tokenB: '0x1111111111111111111111111111111111111111',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.poolsByTokens).toBeDefined();
      expect(result.data.poolsByTokens.items).toEqual([]);
      expect(result.data.poolsByTokens.pageInfo.hasNextPage).toBe(false);
      expect(result.data.poolsByTokens.pageInfo.totalCount).toBe(0);
    });
  });

  describe('pagination consistency', () => {
    it('should maintain consistent ordering across pages', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
              timestamp
              blockNumber
            }
            pageInfo {
              nextCursor
              hasNextPage
            }
          }
        }
      `;

      const firstPage = await testClient.query({
        query,
        variables: { page: { limit: 3 } },
      });

      const secondPage = await testClient.query({
        query,
        variables: {
          page: {
            limit: 3,
            cursor: firstPage.data.recentSwaps.pageInfo.nextCursor,
          },
        },
      });

      expect(firstPage.errors).toBeUndefined();
      expect(secondPage.errors).toBeUndefined();

      // Items should be in consistent order (most recent first)
      const firstPageItems = firstPage.data.recentSwaps.items;
      const secondPageItems = secondPage.data.recentSwaps.items;

      if (firstPageItems.length > 0 && secondPageItems.length > 0) {
        const lastFirstPage = firstPageItems[firstPageItems.length - 1];
        const firstSecondPage = secondPageItems[0];

        // Second page should have older items than first page
        expect(new Date(firstSecondPage.timestamp).getTime()).toBeLessThanOrEqual(
          new Date(lastFirstPage.timestamp).getTime()
        );
      }
    });

    it('should handle cursor expiration gracefully', async () => {
      const query = gql`
        query RecentSwaps($page: PageInput) {
          recentSwaps(page: $page) {
            items {
              id
            }
            pageInfo {
              nextCursor
              hasNextPage
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          page: {
            limit: 10,
            cursor: 'expired-cursor-12345',
          },
        },
      });

      // Should either return an error or reset to first page
      if (result.errors) {
        expect(result.errors[0].message).toContain('Invalid cursor');
      } else {
        expect(result.data.recentSwaps).toBeDefined();
        expect(result.data.recentSwaps.items).toBeDefined();
      }
    });
  });
});
