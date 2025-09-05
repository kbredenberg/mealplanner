import { Context, Next } from "hono";
import { cors } from "hono/cors";
import { securityHeaders } from "hono/security-headers";
import { timeout } from "hono/timeout";
import { securityConfig, config } from "./config.js";
import { rateLimit } from "./cache-middleware.js";

/**
 * Security middleware setup
 */
export function setupSecurity() {
  return [
    // CORS
    cors(securityConfig.cors),

    // Security headers
    securityHeaders(securityConfig.headers),

    // Request timeout
    timeout(securityConfig.timeout),

    // Rate limiting
    rateLimit({
      windowMs: securityConfig.rateLimit.windowMs,
      maxRequests: securityConfig.rateLimit.maxRequests,
    }),

    // Request size limit
    requestSizeLimit(),

    // Content type validation
    contentTypeValidation(),
  ];
}

/**
 * Request size limit middleware
 */
function requestSizeLimit(maxSize: number = 10 * 1024 * 1024) {
  // 10MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header("content-length");

    if (contentLength && parseInt(contentLength) > maxSize) {
      return c.json({ error: "Request entity too large" }, 413);
    }

    return next();
  };
}

/**
 * Content type validation middleware
 */
function contentTypeValidation() {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const contentType = c.req.header("content-type");

    // Only validate content type for methods that typically have a body
    if (["POST", "PUT", "PATCH"].includes(method)) {
      if (!contentType) {
        return c.json({ error: "Content-Type header is required" }, 400);
      }

      // Allow JSON and form data
      const allowedTypes = [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
      ];

      const isValidType = allowedTypes.some((type) =>
        contentType.toLowerCase().startsWith(type)
      );

      if (!isValidType) {
        return c.json({ error: "Unsupported content type" }, 415);
      }
    }

    return next();
  };
}

/**
 * API key validation middleware (for external integrations)
 */
export function apiKeyAuth(requiredKey?: string) {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header("x-api-key");
    const expectedKey = requiredKey || process.env.API_KEY;

    if (!expectedKey) {
      // If no API key is configured, skip validation
      return next();
    }

    if (!apiKey || apiKey !== expectedKey) {
      return c.json({ error: "Invalid or missing API key" }, 401);
    }

    return next();
  };
}

/**
 * IP whitelist middleware
 */
export function ipWhitelist(allowedIPs: string[]) {
  return async (c: Context, next: Next) => {
    const clientIP =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    if (!allowedIPs.includes(clientIP)) {
      return c.json({ error: "Access denied" }, 403);
    }

    return next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header("user-agent") || "unknown";
    const ip = c.req.header("x-forwarded-for") || "unknown";

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Log in production format
    if (config.NODE_ENV === "production") {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          method,
          url,
          status,
          duration,
          ip,
          userAgent,
        })
      );
    } else {
      console.log(`${method} ${url} - ${status} (${duration}ms)`);
    }
  };
}

/**
 * Error boundary middleware
 */
export function errorBoundary() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      console.error("Unhandled error:", error);

      // Don't expose internal errors in production
      if (config.NODE_ENV === "production") {
        return c.json({ error: "Internal server error" }, 500);
      } else {
        return c.json(
          {
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          500
        );
      }
    }
  };
}
