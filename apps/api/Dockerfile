# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build the application
WORKDIR /app/apps/api
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy built application
COPY --from=builder --chown=hono:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/apps/api/package*.json ./
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules

# Copy Prisma files
COPY --from=builder --chown=hono:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=hono:nodejs /app/apps/api/src/generated ./src/generated

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER hono

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]