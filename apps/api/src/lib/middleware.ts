import type { Context, Next } from "hono";
import { auth, validateSession, type User, type Session } from "./auth.js";
import type { ApiResponse } from "./types.js";
import {
  createAuthError,
  createAuthzError,
  ErrorCode,
  asyncHandler,
} from "./error-handler.js";

export const authMiddleware = asyncHandler(async (c: Context, next: Next) => {
  const headers = new Headers();
  Object.entries(c.req.header()).forEach(([key, value]) => {
    const headerValue = Array.isArray(value) ? value[0] : value;
    if (headerValue) {
      headers.set(key.toLowerCase(), headerValue);
    }
  });

  const session = await validateSession(headers);

  if (!session || !session.user) {
    throw createAuthError("Authentication required", ErrorCode.UNAUTHORIZED);
  }

  // Validate session is not expired
  if (session.session.expiresAt < new Date()) {
    throw createAuthError("Session expired", ErrorCode.SESSION_EXPIRED);
  }

  // Add session and user to context
  c.set("session", session.session);
  c.set("user", session.user);

  await next();
});

export const optionalAuthMiddleware = asyncHandler(
  async (c: Context, next: Next) => {
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
    } catch (error) {
      console.error("Optional auth middleware error:", error);
      // Continue without authentication for optional auth
    }

    await next();
  }
);

// Middleware to validate user has access to a household
export const householdAccessMiddleware = asyncHandler(
  async (c: Context, next: Next) => {
    const user = c.get("user");
    const householdId = c.req.param("householdId");

    if (!user || !householdId) {
      throw createAuthError("Invalid request", ErrorCode.INVALID_REQUEST);
    }

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
      throw createAuthzError(
        "Access denied to household",
        ErrorCode.HOUSEHOLD_ACCESS_DENIED
      );
    }

    c.set("household", membership.household);
    c.set("householdRole", membership.role);

    await next();
  }
);
