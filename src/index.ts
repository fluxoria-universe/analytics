import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { buildSchema } from 'type-graphql';
import { RedisCache } from './services/cache/RedisCache';
import { AuthenticationMiddleware } from './middleware/authentication';
import { RateLimitMiddleware } from './middleware/rateLimit';
import { ErrorHandler } from './middleware/errorHandler';

// Import resolvers
import { DEXContractResolver } from './graphql/resolvers/dexContract';
import { PoolResolver } from './graphql/resolvers/pool';
import { SwapResolver } from './graphql/resolvers/swap';
import { PositionResolver } from './graphql/resolvers/position';
import { CollectResolver } from './graphql/resolvers/collect';
import { TVLResolver } from './graphql/resolvers/tvl';
import { AuthResolver } from './graphql/resolvers/auth';

class FluxSightServer {
  private app: express.Application;
  private server: any;
  private apolloServer: ApolloServer;
  private cache: RedisCache;
  private authMiddleware: AuthenticationMiddleware;
  private rateLimitMiddleware: RateLimitMiddleware;

  constructor() {
    this.app = express();
    this.cache = new RedisCache();
    this.authMiddleware = new AuthenticationMiddleware();
    this.rateLimitMiddleware = new RateLimitMiddleware(this.cache, {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'),
      maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '1000'),
    });
  }

  /**
   * Initialize the server
   */
  async initialize(): Promise<void> {
    // Connect to Redis
    await this.cache.connect();

    // Build GraphQL schema
    const schema = await buildSchema({
      resolvers: [
        DEXContractResolver,
        PoolResolver,
        SwapResolver,
        PositionResolver,
        CollectResolver,
        TVLResolver,
        AuthResolver,
      ],
      validate: false, // We handle validation in middleware
    });

    // Create Apollo Server
    this.apolloServer = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer: this.server }),
      ],
      context: this.authMiddleware.createGraphQLContext(),
    });

    // Setup Express middleware
    this.setupMiddleware();

    // Start Apollo Server
    await this.apolloServer.start();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS middleware
    this.app.use(cors({
      origin: process.env['CORS_ORIGIN'] || '*',
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        Math.random().toString(36).substring(2, 15);
      next();
    });

    // Health check endpoint (no auth required)
    this.app.get('/health', this.authMiddleware.healthCheck());

    // JWKS endpoint (no auth required)
    this.app.get('/.well-known/jwks.json', this.authMiddleware.jwksEndpoint());

    // Rate limiting middleware
    this.app.use(this.rateLimitMiddleware.createTieredRateLimit());

    // GraphQL endpoint
    this.app.use('/graphql', 
      expressMiddleware(this.apolloServer, {
        context: this.authMiddleware.createGraphQLContext(),
      })
    );

    // Error handling middleware
    this.app.use(ErrorHandler.handleError());

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        errors: [{
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
        }],
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = parseInt(process.env['API_PORT'] || '4000');
    const host = process.env['API_HOST'] || '0.0.0.0';

    this.server = createServer(this.app);

    await this.initialize();

    this.server.listen(port, host, () => {
      console.log(`🚀 Flux-sight API server running on http://${host}:${port}`);
      console.log(`📊 GraphQL endpoint: http://${host}:${port}/graphql`);
      console.log(`❤️  Health check: http://${host}:${port}/health`);
      console.log(`🔑 JWKS endpoint: http://${host}:${port}/.well-known/jwks.json`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Flux-sight API server...');

    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    if (this.server) {
      this.server.close(() => {
        console.log('✅ Server closed');
      });
    }

    if (this.cache) {
      await this.cache.disconnect();
    }

    process.exit(0);
  }
}

// Start the server
const server = new FluxSightServer();
server.start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default FluxSightServer;
