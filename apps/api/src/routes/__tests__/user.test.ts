import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { userRoutes } from "../user.js";

describe("User Routes", () => {
  const app = new Hono();
  app.route("/user", userRoutes);

  it("should require authentication for profile endpoint", async () => {
    const res = await app.request("/user/profile");
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });

  it("should require authentication for profile update", async () => {
    const res = await app.request("/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Test User" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });

  it("should require authentication for session endpoint", async () => {
    const res = await app.request("/user/session");
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Authentication required");
  });
});
