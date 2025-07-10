# Multi-stage build for optimization
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for building (including Python for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy configuration files
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY src ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory and change ownership
WORKDIR /app
RUN chown nestjs:nodejs /app

# Copy package files with proper ownership
COPY --chown=nestjs:nodejs package*.json ./

# Switch to non-root user before installing dependencies
USER nestjs

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy prisma schema and generate client for production
COPY --chown=nestjs:nodejs prisma ./prisma/
RUN npx prisma generate

# Copy built application from builder stage with proper ownership
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
