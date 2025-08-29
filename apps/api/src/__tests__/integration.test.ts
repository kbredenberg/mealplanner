import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "../lib/auth.js";
import { authRoutes } from "../routes/auth.js";
import { userRoutes } from "../routes/user.js";
import "../lib/hono-types.js";

describe("API Integration Tests", () => {
  const app = new Hono();

  // Setup middleware
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: ["http://localhost:3001", "http://localhost:8081"],
      credentials: true,
    })
  );

  // Better Auth routes
  app.on(["POST", "GET"], "/api/auth/**", (c) => {
    return auth.handler(c.req.raw);
  });

  // Custom auth routes
  app.route("/api/auth", authRoutes);

  // User management routes
  app.route("/api/user", userRoutes);

  // Health check
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        auth: "configured",
      },
    });
  });

  it("should return health status", async () => {
    const res = await app.request("/api/health");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services.auth).toBe("configured");
  });

  it("should return unauthenticated status", async () => {
    const res = await app.request("/api/auth/status");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.authenticated).toBe(false);
  });

  it("should require authentication for protected user endpoints", async () => {
    const endpoints = ["/api/user/profile", "/api/user/session"];

    for (const endpoint of endpoints) {
      const res = await app.request(endpoint);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    }
  });

  it("should require authentication for protected auth endpoints", async () => {
    const endpoints = [
      { path: "/api/auth/logout", method: "POST" },
      { path: "/api/auth/validate", method: "GET" },
    ];

    for (const { path, method } of endpoints) {
      const res = await app.request(path, { method });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Authentication required");
    }
  });

  it("should validate profile update request format", async () => {
    const res = await app.request("/api/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invalidField: "test" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401); // Should fail auth first
    expect(data.success).toBe(false);
  });
});
