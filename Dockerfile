# Free Context MCP Server
# Multi-stage build for minimal image size

# Build stage
FROM oven/bun:1.1 AS builder

WORKDIR /app

# Copy server files
COPY server/package.json server/bun.lock ./server/
WORKDIR /app/server
RUN bun install --frozen-lockfile

# Copy source and build
COPY server/ .
RUN bun run build

# Production stage
FROM oven/bun:1.1-slim

WORKDIR /app

# Install ripgrep for mgrep tool
RUN apt-get update && apt-get install -y --no-install-recommends ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json .
COPY --from=builder /app/server/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/free-context.db
ENV PORT=3001

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Run the API server
CMD ["bun", "run", "dist/index.js", "--mode", "api"]
