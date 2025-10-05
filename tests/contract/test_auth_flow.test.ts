import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('Authentication Flow', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        dexContract: () => {
          throw new Error('Authentication required - DEXContract resolver not implemented');
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

  describe('unauthenticated requests', () => {
    it('should allow health check without authentication', async () => {
      const query = gql`
        query Health {
          health {
            status
            lastBlock
            lagSeconds
            timestamp
          }
        }
      `;

      const result = await testClient.query({ query });

      expect(result.errors).toBeUndefined();
      expect(result.data.health).toBeDefined();
      expect(result.data.health.status).toBe('ok');
    });

    it('should reject protected queries without authentication', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Authentication required');
    });

    it('should reject protected queries with invalid token', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid token');
    });
  });

  describe('authenticated requests', () => {
    it('should allow protected queries with valid token', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
            chainId
            protocol
            status
          }
        }
      `;

      // Mock valid JWT token
      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: `Bearer ${mockToken}`,
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.dexContract).toBeDefined();
    });

    it('should reject requests with insufficient permissions', async () => {
      const query = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
            address
          }
        }
      `;

      // Mock token with READ role only (no ADMIN role)
      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      const result = await testClient.query({
        query,
        variables: {
          address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          chainId: 1,
          protocol: 'UNISWAP_V3',
          startBlock: '12369621',
        },
        context: {
          headers: {
            authorization: `Bearer ${mockToken}`,
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Insufficient permissions');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits per client', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      // Make multiple requests to test rate limiting
      const promises = Array.from({ length: 1001 }, () =>
        testClient.query({
          query,
          variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
          context: {
            headers: {
              authorization: `Bearer ${mockToken}`,
            },
          },
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimitedResults = results.filter(
        (result) => result.status === 'fulfilled' && result.value.errors?.some(
          (error: any) => error.message.includes('Rate limit exceeded')
        )
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });
  });
});
