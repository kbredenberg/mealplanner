import { Context, Next } from "hono";
import { cacheService, CACHE_TTL } from "./cache.js";

export interface CacheOptions {
  ttl?: number;
  keyGenerator?: (c: Context) => string;
  condition?: (c: Context) => boolean;
  varyBy?: string[];
}

/**
 * Cache middleware for Hono
 */
export function cache(options: CacheOptions = {}) {
  const {
    ttl = CACHE_TTL.MEDIUM,
    keyGenerator = (c) => `api:${c.req.method}:${c.req.url}`,
    condition = (c) => c.req.method === "GET",
    varyBy = [],
  } = options;

  return async (c: Context, next: Next) => {
    // Only cache if condition is met
    if (!condition(c)) {
      return next();
    }

    // Generate cache key
    let cacheKey = keyGenerator(c);

    // Add vary-by parameters to cache key
    if (varyBy.length > 0) {
      const varyValues = varyBy
        .map((header) => c.req.header(header) || "")
        .join(":");
      cacheKey += `:${varyValues}`;
    }

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      // Set cache headers
      c.header("X-Cache", "HIT");
      c.header("Cache-Control", `public, max-age=${ttl}`);

      return c.json(cached);
    }

    // Execute the handler
    await next();

    // Cache the response if it's successful
    if (c.res.status === 200) {
      try {
        const responseData = await c.res.clone().json();
        await cacheService.set(cacheKey, responseData, ttl);
        c.header("X-Cache", "MISS");
      } catch (error) {
        console.error("Failed to cache response:", error);
      }
    }

    c.header("Cache-Control", `public, max-age=${ttl}`);
  };
}

/**
 * Cache invalidation middleware
 */
export function invalidateCache(patterns: string[]) {
  return async (c: Context, next: Next) => {
    await next();

    // Invalidate cache patterns after successful mutations
    if (c.res.status >= 200 && c.res.status < 300) {
      await Promise.all(
        patterns.map((pattern) => cacheService.delPattern(pattern))
      );
    }
  };
}

/**
 * Household-specific cache middleware
 */
export function householdCache(
  options: Omit<CacheOptions, "keyGenerator"> = {}
) {
  return cache({
    ...options,
    keyGenerator: (c) => {
      const householdId = c.req.param("householdId") || c.req.param("id");
      const userId = c.get("userId");
      return `household:${householdId}:user:${userId}:${c.req.method}:${c.req.path}`;
    },
  });
}

/**
 * User-specific cache middleware
 */
export function userCache(options: Omit<CacheOptions, "keyGenerator"> = {}) {
  return cache({
    ...options,
    keyGenerator: (c) => {
      const userId = c.get("userId");
      return `user:${userId}:${c.req.method}:${c.req.path}`;
    },
  });
}

/**
 * Rate limiting with cache
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context) => string;
}) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) =>
      `ratelimit:${c.req.header("x-forwarded-for") || "unknown"}`,
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const windowSeconds = Math.floor(windowMs / 1000);

    const current = await cacheService.incr(key, windowSeconds);

    if (current > maxRequests) {
      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", (Date.now() + windowMs).toString());

      return c.json({ error: "Too many requests" }, 429);
    }

    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", (maxRequests - current).toString());

    return next();
  };
}
