import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import { buildSchema } from 'graphql';
import fs from 'fs';
import path from 'path';

describe('Pool Queries', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        pool: () => {
          throw new Error('Pool resolver not implemented');
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

  describe('pool query', () => {
    it('should get pool by ID', async () => {
      const query = gql`
        query GetPool($id: ID!) {
          pool(id: $id) {
            id
            tokenA
            tokenB
            feeTier
            tickSpacing
            blockNumber
            blockHash
            timestamp
            transactionHash
            dexContract {
              id
              address
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
      expect(result.data.pool.id).toBe('0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8');
      expect(result.data.pool.tokenA).toBeDefined();
      expect(result.data.pool.tokenB).toBeDefined();
      expect(result.data.pool.feeTier).toBeDefined();
    });

    it('should return null for non-existent pool', async () => {
      const query = gql`
        query GetPool($id: ID!) {
          pool(id: $id) {
            id
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { id: '0x0000000000000000000000000000000000000000' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeNull();
    });
  });

  describe('poolsByTokens query', () => {
    it('should search pools by token pair', async () => {
      const query = gql`
        query PoolsByTokens($tokenA: String!, $tokenB: String!, $feeTier: Int) {
          poolsByTokens(tokenA: $tokenA, tokenB: $tokenB, feeTier: $feeTier) {
            items {
              id
              tokenA
              tokenB
              feeTier
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
          tokenA: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          feeTier: 3000,
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.poolsByTokens).toBeDefined();
      expect(result.data.poolsByTokens.items).toBeDefined();
      expect(Array.isArray(result.data.poolsByTokens.items)).toBe(true);
      expect(result.data.poolsByTokens.pageInfo).toBeDefined();
    });

    it('should filter by fee tier', async () => {
      const query = gql`
        query PoolsByTokens($tokenA: String!, $tokenB: String!, $feeTier: Int) {
          poolsByTokens(tokenA: $tokenA, tokenB: $tokenB, feeTier: $feeTier) {
            items {
              feeTier
            }
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: {
          tokenA: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          feeTier: 500,
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.poolsByTokens).toBeDefined();
      // All returned pools should have feeTier 500
      result.data.poolsByTokens.items.forEach((pool: any) => {
        expect(pool.feeTier).toBe(500);
      });
    });
  });
});
