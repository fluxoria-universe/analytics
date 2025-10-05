import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('ModifyPosition Queries', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        positionsByOwner: () => {
          throw new Error('PositionsByOwner resolver not implemented');
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

  describe('positionsByOwner query', () => {
    it('should get positions for an owner', async () => {
      const query = gql`
        query PositionsByOwner($owner: String!, $page: PageInput) {
          positionsByOwner(owner: $owner, page: $page) {
            items {
              id
              pool {
                id
                tokenA
                tokenB
              }
              owner
              tickLower
              tickUpper
              liquidityDelta
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
      `;

      const result = await testClient.query({
        query,
        variables: {
          owner: '0x1234567890123456789012345678901234567890',
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.positionsByOwner).toBeDefined();
      expect(result.data.positionsByOwner.items).toBeDefined();
      expect(Array.isArray(result.data.positionsByOwner.items)).toBe(true);
      expect(result.data.positionsByOwner.pageInfo).toBeDefined();
    });

    it('should filter positions by pool ID', async () => {
      const query = gql`
        query PositionsByOwner($owner: String!, $poolId: ID!, $page: PageInput) {
          positionsByOwner(owner: $owner, poolId: $poolId, page: $page) {
            items {
              id
              pool {
                id
              }
              owner
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          owner: '0x1234567890123456789012345678901234567890',
          poolId: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
          page: { limit: 5 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.positionsByOwner).toBeDefined();
      // All returned positions should be from the specified pool
      result.data.positionsByOwner.items.forEach((position: any) => {
        expect(position.pool.id).toBe('0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8');
        expect(position.owner).toBe('0x1234567890123456789012345678901234567890');
      });
    });

    it('should filter positions by time range', async () => {
      const query = gql`
        query PositionsByOwner($owner: String!, $timeRange: TimeRangeInput, $page: PageInput) {
          positionsByOwner(owner: $owner, timeRange: $timeRange, page: $page) {
            items {
              id
              timestamp
            }
          }
        }
      `;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const result = await testClient.query({
        query,
        variables: {
          owner: '0x1234567890123456789012345678901234567890',
          timeRange: {
            from: oneDayAgo.toISOString(),
            to: now.toISOString(),
          },
          page: { limit: 10 },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.positionsByOwner).toBeDefined();
      // All returned positions should be within the time range
      result.data.positionsByOwner.items.forEach((position: any) => {
        const positionTime = new Date(position.timestamp);
        expect(positionTime.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
        expect(positionTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });
  });
});
