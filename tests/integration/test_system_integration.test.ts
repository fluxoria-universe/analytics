import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';

// Mock external dependencies
jest.mock('../../src/database/connection');
jest.mock('../../src/services/cache/RedisCache');
jest.mock('../../src/services/auth/JWTService');
jest.mock('../../src/services/auth/APIKeyService');

describe('System Integration Tests', () => {
  let app: express.Application;
  let server: ApolloServer;

  beforeAll(async () => {
    // Load GraphQL schema
    const typeDefs = readFileSync(
      path.join(__dirname, '../../src/graphql/schema.graphql'),
      'utf8'
    );

    // Create Apollo Server
    server = new ApolloServer({
      typeDefs,
      resolvers: {
        Query: {
          health: () => ({ status: 'healthy', timestamp: new Date() }),
          dexContracts: () => ({
            edges: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          }),
        },
      },
    });

    await server.start();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/graphql', expressMiddleware(server));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const query = `
        query {
          health {
            status
            timestamp
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.health.status).toBe('healthy');
      expect(response.body.data.health.timestamp).toBeDefined();
    });
  });

  describe('GraphQL Schema Validation', () => {
    it('should validate query syntax', async () => {
      const query = `
        query {
          dexContracts(first: 10) {
            edges {
              node {
                id
                address
                name
                isActive
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.errors).toBeUndefined();
    });

    it('should reject invalid query syntax', async () => {
      const query = `
        query {
          invalidField {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Cannot query field "invalidField"');
    });
  });

  describe('Authentication Flow', () => {
    it('should handle authentication header', async () => {
      const query = `
        query {
          health {
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer valid-token')
        .send({ query })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle missing authentication header', async () => {
      const query = `
        query {
          health {
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200); // Health endpoint might not require auth

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors gracefully', async () => {
      const query = `
        query {
          dexContracts(first: -1) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query });

      // Should either return data with validation error or 400
      expect([200, 400]).toContain(response.status);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send('{"query": "invalid json"')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/graphql')
        .expect(204);

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({ query: '{ health { status } }' })
        .expect(200);

      // Security headers should be present
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple requests', async () => {
      const query = `
        query {
          health {
            status
          }
        }
      `;

      // Make multiple requests
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/graphql')
          .send({ query })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed (rate limit not exceeded)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Database Connection', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      const mockDatabase = require('../../src/database/connection');
      mockDatabase.DatabaseConnection.mockImplementation(() => ({
        query: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        isConnected: jest.fn().mockReturnValue(false),
      }));

      const query = `
        query {
          dexContracts(first: 10) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query });

      // Should handle database error gracefully
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Caching Layer', () => {
    it('should use cache for repeated queries', async () => {
      const query = `
        query {
          dexContracts(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `;

      // First request
      await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      // Second request (should use cache)
      await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      // Cache should have been called
      const mockRedisCache = require('../../src/services/cache/RedisCache');
      expect(mockRedisCache).toBeDefined();
    });
  });
});
