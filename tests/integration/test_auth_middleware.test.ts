import { gql } from 'graphql-tag';
import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';

describe('Authentication Middleware Integration', () => {
  let testClient: any;
  let server: ApolloServer;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '../../contracts/schema.graphql');
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    
    const resolvers = {
      Query: {
        dexContract: () => {
          throw new Error('Authentication middleware not implemented');
        },
        pool: () => {
          throw new Error('Authentication middleware not implemented');
        },
        recentSwaps: () => {
          throw new Error('Authentication middleware not implemented');
        },
        health: () => ({
          status: 'ok',
          lastBlock: '0',
          lagSeconds: 0,
          timestamp: new Date().toISOString(),
        }),
      },
      Mutation: {
        addDEXContract: () => {
          throw new Error('Authentication middleware not implemented');
        },
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

  describe('JWT token validation', () => {
    it('should reject requests without authorization header', async () => {
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

    it('should reject requests with invalid JWT format', async () => {
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
            authorization: 'Bearer invalid-jwt-format',
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid token format');
    });

    it('should reject requests with expired JWT', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      // Mock expired JWT token
      const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.mock-signature';

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: `Bearer ${expiredToken}`,
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Token expired');
    });

    it('should accept requests with valid JWT', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      // Mock valid JWT token
      const validToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: `Bearer ${validToken}`,
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.dexContract).toBeDefined();
    });
  });

  describe('role-based access control', () => {
    it('should allow READ role to access queries', async () => {
      const query = gql`
        query GetPool($id: ID!) {
          pool(id: $id) {
            id
            tokenA
            tokenB
          }
        }
      `;

      const readToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZWFkLWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      const result = await testClient.query({
        query,
        variables: { id: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8' },
        context: {
          headers: {
            authorization: `Bearer ${readToken}`,
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.pool).toBeDefined();
    });

    it('should reject READ role from admin mutations', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
          }
        }
      `;

      const readToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyZWFkLWNsaWVudCIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      const result = await testClient.mutate({
        mutation,
        variables: {
          address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          chainId: 1,
          protocol: 'UNISWAP_V3',
          startBlock: '12369621',
        },
        context: {
          headers: {
            authorization: `Bearer ${readToken}`,
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Insufficient permissions');
    });

    it('should allow ADMIN role to access mutations', async () => {
      const mutation = gql`
        mutation AddDEXContract($address: String!, $chainId: Int!, $protocol: DEXProtocol!, $startBlock: String!) {
          addDEXContract(address: $address, chainId: $chainId, protocol: $protocol, startBlock: $startBlock) {
            id
            address
          }
        }
      `;

      const adminToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi1jbGllbnQiLCJyb2xlcyI6WyJBRE1JTiJdLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDkwMH0.mock-signature';

      const result = await testClient.mutate({
        mutation,
        variables: {
          address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          chainId: 1,
          protocol: 'UNISWAP_V3',
          startBlock: '12369621',
        },
        context: {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.addDEXContract).toBeDefined();
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

      const clientToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyYXRlLXRlc3QtY2xpZW50Iiwicm9sZXMiOlsiUkVBRCJdLCJxdW90YVBlck1pbnV0ZSI6MTAwLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDkwMH0.mock-signature';

      // Make requests up to the rate limit
      const promises = Array.from({ length: 101 }, () =>
        testClient.query({
          query,
          variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
          context: {
            headers: {
              authorization: `Bearer ${clientToken}`,
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

    it('should reset rate limit after window expires', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const clientToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJyYXRlLXRlc3QtY2xpZW50Iiwicm9sZXMiOlsiUkVBRCJdLCJxdW90YVBlck1pbnV0ZSI6MTAwLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDkwMH0.mock-signature';

      // Wait for rate limit window to reset (simulated)
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: `Bearer ${clientToken}`,
          },
        },
      });

      // Should succeed after rate limit reset
      expect(result.errors).toBeUndefined();
    });
  });

  describe('client identification', () => {
    it('should extract client ID from JWT token', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const clientToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudC0xMjMiLCJyb2xlcyI6WyJSRUFEIl0sImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwOTAwfQ.mock-signature';

      const result = await testClient.query({
        query,
        variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
        context: {
          headers: {
            authorization: `Bearer ${clientToken}`,
          },
        },
      });

      expect(result.errors).toBeUndefined();
      // Client ID should be extracted and used for rate limiting
    });

    it('should handle multiple clients independently', async () => {
      const query = gql`
        query GetDEXContract($address: String!) {
          dexContract(address: $address) {
            id
            address
          }
        }
      `;

      const client1Token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGllbnQtMSIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';
      const client2Token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGllbnQtMiIsInJvbGVzIjpbIlJFQUQiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDA5MDB9.mock-signature';

      // Both clients should be able to make requests independently
      const [result1, result2] = await Promise.all([
        testClient.query({
          query,
          variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
          context: {
            headers: {
              authorization: `Bearer ${client1Token}`,
            },
          },
        }),
        testClient.query({
          query,
          variables: { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
          context: {
            headers: {
              authorization: `Bearer ${client2Token}`,
            },
          },
        }),
      ]);

      expect(result1.errors).toBeUndefined();
      expect(result2.errors).toBeUndefined();
    });
  });
});
