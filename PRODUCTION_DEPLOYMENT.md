# Production Deployment Guide

This guide covers the production deployment and optimization configurations for the Meal Planner application.

## Performance Optimizations Implemented

### 1. Database Query Optimization and Indexing

#### Database Indexes Added

- **User table**: Email, created_at indexes
- **Household table**: Creator ID, created_at indexes
- **Household members**: User ID, household ID, role indexes with composite indexes
- **Inventory items**: Household ID, category, name, expiry date, updated_at indexes
- **Shopping list items**: Household ID, completed status, category indexes
- **Recipes**: Creator ID, name, tags (GIN index), created_at indexes
- **Meal plans**: Household ID, week start/end date indexes
- **Meal plan items**: Date, meal type, cooked status with composite indexes

#### Query Optimization Features

- Proper foreign key relationships with cascading deletes
- Composite indexes for common query patterns
- GIN indexes for array fields (recipe tags)
- Strategic indexing based on expected query patterns

### 2. API Response Caching with Redis

#### Cache Implementation

- **Redis Integration**: Full Redis caching layer with connection pooling
- **Cache Middleware**: Automatic caching for GET requests with configurable TTL
- **Cache Invalidation**: Smart cache invalidation on data mutations
- **Rate Limiting**: Redis-based rate limiting to prevent abuse
- **Session Management**: Redis-backed session storage

#### Cache Strategies

- **Household Data**: Cached with automatic invalidation on updates
- **User Sessions**: Persistent session storage with Redis
- **API Responses**: Configurable response caching with vary-by headers
- **Request Deduplication**: Prevent duplicate API calls

### 3. Production Environment Variables and Security

#### Security Features

- **Environment Validation**: Zod-based environment variable validation
- **Security Headers**: Comprehensive security headers (HSTS, CSP, etc.)
- **CORS Configuration**: Production-ready CORS settings
- **Rate Limiting**: Configurable rate limiting per endpoint
- **Request Validation**: Content-type and request size validation
- **Error Handling**: Production-safe error responses

#### Configuration Management

- **Environment-specific configs**: Development vs production settings
- **Security middleware**: Comprehensive security middleware stack
- **Health checks**: Detailed health monitoring for all services
- **Logging**: Structured logging with configurable levels

### 4. Mobile App Bundle Size and Loading Performance

#### Bundle Optimization

- **Metro Configuration**: Optimized Metro bundler with advanced minification
- **Tree Shaking**: Aggressive dead code elimination
- **Code Splitting**: Platform-specific code splitting
- **Asset Optimization**: WebP support and image optimization
- **Caching**: Aggressive build caching for faster builds

#### Performance Features

- **Lazy Loading**: Component-level lazy loading with intersection observer
- **Image Optimization**: Optimized image component with lazy loading
- **Memory Monitoring**: Runtime memory usage monitoring
- **Network Optimization**: Request batching and deduplication
- **React Native Optimizations**: FlatList, ScrollView, and TextInput optimizations

## Deployment Architecture

### Docker Configuration

- **Multi-stage builds**: Optimized Docker builds with minimal production images
- **Security**: Non-root user execution and minimal attack surface
- **Health checks**: Built-in container health monitoring
- **Resource optimization**: Efficient layer caching and dependency management

### Infrastructure Components

- **API Server**: Hono-based API with Redis caching
- **PostgreSQL**: Primary database with optimized indexes
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy with rate limiting and SSL termination
- **Monitoring**: Prometheus integration for metrics collection

## Production Deployment Steps

### 1. Environment Setup

```bash
# Copy and configure environment variables
cp apps/api/.env.production apps/api/.env

# Update with your production values:
# - DATABASE_URL
# - REDIS_HOST, REDIS_PASSWORD
# - BETTER_AUTH_SECRET, BETTER_AUTH_URL
# - CORS_ORIGIN
```

### 2. Database Migration

```bash
# Run database migrations
cd apps/api
npm run db:migrate

# Apply performance indexes
npm run db:push
```

### 3. Docker Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# Check service health
docker-compose -f docker-compose.production.yml ps
```

### 4. Mobile App Build

```bash
# Optimize images before building
cd apps/mobile
npm run optimize:images

# Build for production
npm run build:android  # or build:ios
```

## Monitoring and Health Checks

### Health Check Endpoints

- **Liveness**: `/health/live` - Basic service availability
- **Readiness**: `/health/ready` - Service ready to handle requests
- **Detailed**: `/health` - Comprehensive health status with metrics

### Performance Monitoring

- **Database**: Connection status and query performance
- **Redis**: Cache hit rates and connection health
- **Memory**: Heap usage and memory leaks detection
- **API**: Response times and error rates

## Security Considerations

### Production Security Features

- **HTTPS**: SSL/TLS termination at nginx level
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: Per-IP and per-endpoint rate limiting
- **Input Validation**: Comprehensive request validation
- **Error Handling**: No sensitive information in error responses

### Recommended Security Practices

1. **SSL Certificates**: Use Let's Encrypt or commercial SSL certificates
2. **Firewall**: Configure firewall rules to restrict access
3. **Database Security**: Use strong passwords and connection encryption
4. **API Keys**: Rotate API keys and secrets regularly
5. **Monitoring**: Set up security monitoring and alerting

## Performance Benchmarks

### Expected Performance Improvements

- **Database Queries**: 50-80% faster with proper indexing
- **API Response Times**: 60-90% faster with Redis caching
- **Mobile Bundle Size**: 20-40% smaller with optimizations
- **Image Loading**: 70% faster with lazy loading and WebP

### Monitoring Metrics

- **API Response Time**: < 200ms for cached responses
- **Database Query Time**: < 50ms for indexed queries
- **Cache Hit Rate**: > 80% for frequently accessed data
- **Mobile App Load Time**: < 3 seconds for initial load

## Troubleshooting

### Common Issues

1. **Redis Connection**: Check Redis host and password configuration
2. **Database Performance**: Monitor slow query logs and index usage
3. **Memory Usage**: Monitor heap usage and implement memory limits
4. **Cache Invalidation**: Ensure proper cache invalidation on data updates

### Performance Debugging

- Use `/health` endpoint for service status
- Monitor Redis cache hit rates
- Check database query performance with EXPLAIN
- Use React Native performance profiler for mobile optimization

## Scaling Considerations

### Horizontal Scaling

- **Load Balancing**: Use nginx or cloud load balancers
- **Database Replicas**: Set up read replicas for better performance
- **Redis Clustering**: Implement Redis cluster for high availability
- **CDN**: Use CDN for static assets and image optimization

### Vertical Scaling

- **Database**: Increase CPU and memory for database server
- **Redis**: Allocate sufficient memory for cache storage
- **API Server**: Scale CPU based on request volume
- **Monitoring**: Implement comprehensive monitoring and alerting
