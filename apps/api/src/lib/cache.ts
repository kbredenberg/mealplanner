import Redis from "ioredis";

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Connection pool settings
  maxLoadingTimeout: 5000,
  // Graceful shutdown
  enableOfflineQueue: false,
});

// Cache key prefixes
export const CACHE_KEYS = {
  USER_SESSION: "session:user:",
  HOUSEHOLD_DATA: "household:",
  INVENTORY_LIST: "inventory:household:",
  SHOPPING_LIST: "shopping:household:",
  RECIPES_LIST: "recipes:user:",
  MEAL_PLAN: "mealplan:household:",
  USER_HOUSEHOLDS: "user:households:",
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(
    key: string,
    data: any,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error("Cache delete pattern error:", error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      console.error("Cache expire error:", error);
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error("Cache incr error:", error);
      return 0;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        if (ttl) {
          pipeline.setex(key, ttl, JSON.stringify(value));
        } else {
          pipeline.set(key, JSON.stringify(value));
        }
      });

      await pipeline.exec();
    } catch (error) {
      console.error("Cache mset error:", error);
    }
  }

  /**
   * Cache with automatic invalidation on household data changes
   */
  async cacheHouseholdData<T>(
    householdId: string,
    dataType: keyof typeof CACHE_KEYS,
    data: T,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<void> {
    const key = `${CACHE_KEYS[dataType]}${householdId}`;
    await this.set(key, data, ttl);
  }

  /**
   * Get cached household data
   */
  async getHouseholdData<T>(
    householdId: string,
    dataType: keyof typeof CACHE_KEYS
  ): Promise<T | null> {
    const key = `${CACHE_KEYS[dataType]}${householdId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate all household-related cache
   */
  async invalidateHouseholdCache(householdId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.HOUSEHOLD_DATA}${householdId}*`,
      `${CACHE_KEYS.INVENTORY_LIST}${householdId}*`,
      `${CACHE_KEYS.SHOPPING_LIST}${householdId}*`,
      `${CACHE_KEYS.MEAL_PLAN}${householdId}*`,
    ];

    await Promise.all(patterns.map((pattern) => this.delPattern(pattern)));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await cacheService.close();
});

process.on("SIGINT", async () => {
  await cacheService.close();
});
