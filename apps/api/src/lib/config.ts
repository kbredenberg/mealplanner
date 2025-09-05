import { z } from "zod";

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("3001"),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_CONNECTION_POOL_SIZE: z.string().transform(Number).default(5),
  DATABASE_CONNECTION_TIMEOUT: z.string().transform(Number).default(30000),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default(0),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Security
  CORS_ORIGIN: z.string().default("*"),
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  API_REQUEST_TIMEOUT: z.string().transform(Number).default(30000),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("pretty"),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default(30000),
  WS_MAX_CONNECTIONS: z.string().transform(Number).default(1000),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default(10485760), // 10MB
  ALLOWED_FILE_TYPES: z.string().default("image/jpeg,image/png,image/webp"),

  // Monitoring
  HEALTH_CHECK_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default(true),
  METRICS_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default(false),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    process.exit(1);
  }
};

export const config = parseEnv();

// Security configurations
export const securityConfig = {
  // CORS settings
  cors: {
    origin:
      config.NODE_ENV === "production"
        ? config.CORS_ORIGIN.split(",").map((origin) => origin.trim())
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  },

  // Rate limiting
  rateLimit: {
    windowMs: config.API_RATE_LIMIT_WINDOW_MS,
    maxRequests: config.API_RATE_LIMIT_MAX_REQUESTS,
  },

  // Request timeout
  timeout: config.API_REQUEST_TIMEOUT,

  // Security headers
  headers: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(config.NODE_ENV === "production" && {
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    }),
  },
};

// Database configuration
export const databaseConfig = {
  connectionLimit: config.DATABASE_CONNECTION_POOL_SIZE,
  connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT,
  idleTimeoutMillis: 30000,
  maxUses: 7500,
};

// Cache configuration
export const cacheConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  db: config.REDIS_DB,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  maxLoadingTimeout: 5000,
  enableOfflineQueue: false,
};

// WebSocket configuration
export const wsConfig = {
  heartbeatInterval: config.WS_HEARTBEAT_INTERVAL,
  maxConnections: config.WS_MAX_CONNECTIONS,
  pingTimeout: 5000,
  upgradeTimeout: 10000,
};

// Logging configuration
export const loggingConfig = {
  level: config.LOG_LEVEL,
  format: config.LOG_FORMAT,
  timestamp: true,
  colorize: config.NODE_ENV !== "production",
};

// File upload configuration
export const uploadConfig = {
  maxFileSize: config.MAX_FILE_SIZE,
  allowedTypes: config.ALLOWED_FILE_TYPES.split(",").map((type) => type.trim()),
  uploadPath: "./uploads",
  tempPath: "./temp",
};

// Health check configuration
export const healthConfig = {
  enabled: config.HEALTH_CHECK_ENABLED,
  endpoint: "/health",
  checks: {
    database: true,
    redis: true,
    memory: true,
    disk: false,
  },
};

// Metrics configuration
export const metricsConfig = {
  enabled: config.METRICS_ENABLED,
  endpoint: "/metrics",
  collectDefaultMetrics: true,
  requestDuration: true,
  requestCount: true,
};
