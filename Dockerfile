FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fluxsight -u 1001

# Create keys directory
RUN mkdir -p /app/keys && chown -R fluxsight:nodejs /app/keys

# Switch to non-root user
USER fluxsight

# Expose ports (4000 for app, 9229 for debugging)
EXPOSE 4000 9229

# Start the application in development mode
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fluxsight -u 1001

# Create keys directory
RUN mkdir -p /app/keys && chown -R fluxsight:nodejs /app/keys

# Switch to non-root user
USER fluxsight

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["npm", "start"]
