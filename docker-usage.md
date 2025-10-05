# Docker Usage Guide

This project includes two Docker Compose configurations for different environments.

## Development Environment

Use `docker-compose.dev.yml` for local development. This configuration only includes third-party services (PostgreSQL, Redis, and development tools) while you run the application locally.

### Features:
- **Third-Party Services Only**: PostgreSQL and Redis containers for development
- **Development Tools**: 
  - Redis Commander (http://localhost:8081) for Redis management
  - pgAdmin (http://localhost:8080) for database management
- **Development Database**: Separate `fluxsight_dev` database
- **Local Application**: Run your application locally with `npm run dev`

### Usage:

```bash
# Start development services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development services
docker-compose -f docker-compose.dev.yml down

# Run your application locally (in another terminal)
npm run dev
```

### Development Tools Access:
- **Redis Commander**: http://localhost:8081 (admin interface for Redis)
- **pgAdmin**: http://localhost:8080
  - Email: admin@fluxsight.dev
  - Password: admin
  - Add server with host: localhost, port: 5432, database: fluxsight_dev

### Local Development Setup:
1. Start the services: `docker-compose -f docker-compose.dev.yml up -d`
2. Run your application: `npm run dev`
3. Your app will connect to the containerized services on localhost

## Production Environment

Use `docker-compose.yml` for production deployment.

### Features:
- **Optimized Build**: Production dependencies only
- **Security**: Non-root user execution
- **Health Checks**: Built-in health monitoring
- **Restart Policy**: Automatic restart on failure
- **Production Database**: `fluxsight` database

### Usage:

```bash
# Start production environment
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop production environment
docker-compose down
```

## Environment Variables

Both configurations use the same environment variables. Copy `env.template` to `.env` and configure:

```bash
cp env.template .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NODE_ENV`: Environment (development/production)
- `DEBUG`: Debug logging configuration

## Database Management

### Development:
- Database: `fluxsight_dev`
- Access via pgAdmin or direct connection to localhost:5432

### Production:
- Database: `fluxsight`
- Access via direct connection to localhost:5432

## Troubleshooting

### Port Conflicts:
If ports are already in use, modify the port mappings in the compose files:
```yaml
ports:
  - "4001:4000"  # Change 4000 to 4001
```

### Volume Issues:
Clear volumes if you encounter data issues:
```bash
# Development
docker-compose -f docker-compose.dev.yml down -v

# Production
docker-compose down -v
```

### Rebuild Everything:
```bash
# Development
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose down
docker-compose build --no-cache
docker-compose up
```
