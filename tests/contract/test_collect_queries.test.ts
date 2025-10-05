import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('CollectEvent Queries', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
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

  describe('collects field on Pool', () => {
    it('should get collects for a pool', async () => {
      const query = gql`
        query GetPoolCollects($id: ID!, $page: PageInput) {
          pool(id: $id) {
            id
            collects(page: $page) {
              items {
                id
                pool {
                  id
                }
                owner
                recipient
                tickLower
                tickUpper
                amount0
                amount1
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
      expect(result.data.pool.collects.items).toBeDefined();
      expect(Array.isArray(result.data.pool.collects.items)).toBe(true);
      expect(result.data.pool.collects.pageInfo).toBeDefined();
    });

    it('should filter collects by owner', async () => {
      const query = gql`
        query GetPoolCollects($id: ID!, $owner: String!, $page: PageInput) {
          pool(id: $id) {
            id
            collects(owner: $owner, page: $page) {
              items {
                id
                owner
              }
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          owner: '0x1234567890123456789012345678901234567890',
          page: { limit: 5 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.collects).toBeDefined();
      // All returned collects should be from the specified owner
      result.data.pool.collects.items.forEach((collect: any) => {
        expect(collect.owner).toBe('0x1234567890123456789012345678901234567890');
      });
    });

    it('should filter collects by time range', async () => {
      const query = gql`
        query GetPoolCollects($id: ID!, $timeRange: TimeRangeInput, $page: PageInput) {
          pool(id: $id) {
            id
            collects(timeRange: $timeRange, page: $page) {
              items {
                id
                timestamp
              }
            }
          }
        }
      `;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await testClient.query({
        query,
        variables: {
          id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          timeRange: {
            from: oneWeekAgo.toISOString(),
            to: now.toISOString(),
          },
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.collects).toBeDefined();
      // All returned collects should be within the time range
      result.data.pool.collects.items.forEach((collect: any) => {
        const collectTime = new Date(collect.timestamp);
        expect(collectTime.getTime()).toBeGreaterThanOrEqual(oneWeekAgo.getTime());
        expect(collectTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });
  });
});
