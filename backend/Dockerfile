# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# schema.sql must sit next to migrate.js so fs.readFileSync(__dirname, 'schema.sql') works
COPY --from=builder /app/src/database/schema.sql ./dist/database/schema.sql

RUN mkdir -p uploads

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run migrations then start the server
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
