import type { Context, Next } from "hono";
import { auth, validateSession, type User, type Session } from "./auth.js";
import type { ApiResponse } from "./types.js";

export async function authMiddleware(c: Context, next: Next) {
  try {
    const headers = new Headers();
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) {
        headers.set(key.toLowerCase(), headerValue);
      }
    });

    const session = await validateSession(headers);

    if (!session || !session.user) {
      const response: ApiResponse = {
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
      return c.json(response, 401);
    }

    // Validate session is not expired
    if (session.session.expiresAt < new Date()) {
      const response: ApiResponse = {
        success: false,
        error: "Session expired",
        code: "SESSION_EXPIRED",
      };
      return c.json(response, 401);
    }

    // Add session and user to context
    c.set("session", session.session);
    c.set("user", session.user);

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    const response: ApiResponse = {
      success: false,
      error: "Authentication failed",
      code: "AUTH_ERROR",
    };
    return c.json(response, 500);
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const headers = new Headers();
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) {
        headers.set(key.toLowerCase(), headerValue);
      }
    });

    const session = await validateSession(headers);

    if (session && session.user && session.session.expiresAt >= new Date()) {
      c.set("session", session.session);
      c.set("user", session.user);
    }

    await next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    // Continue without authentication for optional auth
    await next();
  }
}

// Middleware to validate user has access to a household
export async function householdAccessMiddleware(c: Context, next: Next) {
  const user = c.get("user");
  const householdId = c.req.param("householdId");

  if (!user || !householdId) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid request",
      code: "INVALID_REQUEST",
    };
    return c.json(response, 400);
  }

  try {
    const { prisma } = await import("./prisma.js");

    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: user.id,
          householdId: householdId,
        },
      },
      include: {
        household: true,
      },
    });

    if (!membership) {
      const response: ApiResponse = {
        success: false,
        error: "Access denied to household",
        code: "HOUSEHOLD_ACCESS_DENIED",
      };
      return c.json(response, 403);
    }

    c.set("household", membership.household);
    c.set("householdRole", membership.role);

    await next();
  } catch (error) {
    console.error("Household access middleware error:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to validate household access",
      code: "HOUSEHOLD_ACCESS_ERROR",
    };
    return c.json(response, 500);
  }
}
