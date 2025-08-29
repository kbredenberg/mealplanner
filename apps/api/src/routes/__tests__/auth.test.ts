import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { authRoutes } from "../auth.js";

describe("Auth Routes", () => {
  const app = new Hono();
  app.route("/auth", authRoutes);

  it("should return authentication status for unauthenticated user", async () => {
    const res = await app.request("/auth/status");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.authenticated).toBe(false);
    expect(data.data.user).toBe(null);
    expect(data.data.session).toBe(null);
  });

  it("should require authentication for logout endpoint", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });

  it("should require authentication for validate endpoint", async () => {
    const res = await app.request("/auth/validate");
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });
});
