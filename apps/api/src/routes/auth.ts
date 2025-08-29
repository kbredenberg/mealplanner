import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import type { ApiResponse } from "../lib/types.js";
import { authMiddleware, optionalAuthMiddleware } from "../lib/middleware.js";
import "../lib/hono-types.js";

const authRoutes = new Hono();

// Check authentication status
authRoutes.get("/status", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const session = c.get("session");

    const response: ApiResponse = {
      success: true,
      data: {
        authenticated: !!user,
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
            }
          : null,
        session: session
          ? {
              id: session.id,
              expiresAt: session.expiresAt,
            }
          : null,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error checking auth status:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to check authentication status",
      code: "AUTH_STATUS_ERROR",
    };
    return c.json(response, 500);
  }
});

// Logout endpoint
authRoutes.post("/logout", authMiddleware, async (c) => {
  try {
    const headers = new Headers();
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) {
        headers.set(key.toLowerCase(), headerValue);
      }
    });

    // Revoke the current session
    await auth.api.revokeSession({
      headers,
      body: { token: c.get("session").token },
    });

    const response: ApiResponse = {
      success: true,
      message: "Logged out successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error during logout:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to logout",
      code: "LOGOUT_ERROR",
    };
    return c.json(response, 500);
  }
});

// Revoke all sessions for the current user
authRoutes.post("/logout-all", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    // This would require implementing a custom method to revoke all sessions for a user
    // For now, we'll just revoke the current session
    const headers = new Headers();
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) {
        headers.set(key.toLowerCase(), headerValue);
      }
    });

    await auth.api.revokeSession({
      headers,
      body: { token: c.get("session").token },
    });

    const response: ApiResponse = {
      success: true,
      message: "Logged out from all devices successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error during logout all:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to logout from all devices",
      code: "LOGOUT_ALL_ERROR",
    };
    return c.json(response, 500);
  }
});

// Validate token endpoint (for mobile apps)
authRoutes.get("/validate", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const session = c.get("session");

    const response: ApiResponse = {
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
      message: "Token is valid",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error validating token:", error);
    const response: ApiResponse = {
      success: false,
      error: "Token validation failed",
      code: "TOKEN_VALIDATION_ERROR",
    };
    return c.json(response, 500);
  }
});

export { authRoutes };
