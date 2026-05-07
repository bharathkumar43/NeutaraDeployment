# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy schema.sql into dist so the compiled migrate.js can find it
COPY --from=builder /app/src/database/schema.sql ./dist/database/schema.sql

# Uploads directory (mounted as a volume at runtime)
RUN mkdir -p uploads

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run migrations then start the server
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]