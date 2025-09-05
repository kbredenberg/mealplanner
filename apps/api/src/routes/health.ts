import { Hono } from "hono";
import { cacheService } from "../lib/cache.js";
import { prisma } from "../lib/prisma.js";
import { config, healthConfig } from "../lib/config.js";

const health = new Hono();

interface HealthCheck {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    memory: HealthCheckResult;
    disk?: HealthCheckResult;
  };
}

interface HealthCheckResult {
  status: "pass" | "fail" | "warn";
  responseTime?: number;
  details?: any;
  error?: string;
}

// Detailed health check endpoint
health.get("/", async (c) => {
  if (!healthConfig.enabled) {
    return c.json({ message: "Health checks disabled" }, 404);
  }

  const startTime = Date.now();
  const checks: HealthCheck["checks"] = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemory(),
  };

  if (healthConfig.checks.disk) {
    checks.disk = await checkDisk();
  }

  // Determine overall status
  const hasFailures = Object.values(checks).some(
    (check) => check.status === "fail"
  );
  const hasWarnings = Object.values(checks).some(
    (check) => check.status === "warn"
  );

  const overallStatus: HealthCheck["status"] = hasFailures
    ? "unhealthy"
    : hasWarnings
      ? "degraded"
      : "healthy";

  const healthCheck: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: config.NODE_ENV,
    checks,
  };

  const statusCode = overallStatus === "healthy" ? 200 : 503;

  // Add response time header
  c.header("X-Response-Time", `${Date.now() - startTime}ms`);

  return c.json(healthCheck, statusCode);
});

// Simple liveness probe
health.get("/live", async (c) => {
  return c.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Simple readiness probe
health.get("/ready", async (c) => {
  const dbCheck = await checkDatabase();
  const redisCheck = await checkRedis();

  const isReady = dbCheck.status === "pass" && redisCheck.status === "pass";

  return c.json(
    {
      status: isReady ? "ready" : "not ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck.status,
        redis: redisCheck.status,
      },
    },
    isReady ? 200 : 503
  );
});

// Database health check
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "pass",
      responseTime: Date.now() - startTime,
      details: {
        connection: "active",
      },
    };
  } catch (error) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Redis health check
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const isHealthy = await cacheService.healthCheck();

    if (isHealthy) {
      return {
        status: "pass",
        responseTime: Date.now() - startTime,
        details: {
          connection: "active",
        },
      };
    } else {
      return {
        status: "fail",
        responseTime: Date.now() - startTime,
        error: "Redis connection failed",
      };
    }
  } catch (error) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown Redis error",
    };
  }
}

// Memory health check
function checkMemory(): HealthCheckResult {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;

  let status: HealthCheckResult["status"] = "pass";

  if (memoryUsagePercent > 90) {
    status = "fail";
  } else if (memoryUsagePercent > 80) {
    status = "warn";
  }

  return {
    status,
    details: {
      heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    },
  };
}

// Disk health check (optional)
async function checkDisk(): Promise<HealthCheckResult> {
  try {
    const fs = await import("fs/promises");
    const stats = await fs.statSync(".");

    // This is a basic implementation - in production you might want to use
    // a more sophisticated disk space checking library
    return {
      status: "pass",
      details: {
        available: "N/A", // Would need additional library to get disk space
        message: "Disk check not fully implemented",
      },
    };
  } catch (error) {
    return {
      status: "fail",
      error: error instanceof Error ? error.message : "Disk check failed",
    };
  }
}

export default health;
