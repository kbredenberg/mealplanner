import { Hono } from "hono";
import { authMiddleware } from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import type { ApiResponse } from "../lib/types.js";
import { auth } from "../lib/auth.js";
import "../lib/hono-types.js";

const userRoutes = new Hono();

// Get current user profile
userRoutes.get("/profile", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        householdMembers: {
          include: {
            household: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      const response: ApiResponse = {
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      return c.json(response, 404);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...userProfile,
        households: userProfile.householdMembers.map((member: any) => ({
          id: member.household.id,
          name: member.household.name,
          description: member.household.description,
          role: member.role,
          joinedAt: member.joinedAt,
        })),
        householdMembers: undefined, // Remove the raw householdMembers data
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch user profile",
      code: "PROFILE_FETCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Update user profile
userRoutes.put("/profile", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate input
    const allowedFields = ["name", "avatar"];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "No valid fields to update",
        code: "INVALID_UPDATE_DATA",
      };
      return c.json(response, 400);
    }

    // Validate name if provided
    if (
      updateData.name &&
      (typeof updateData.name !== "string" ||
        updateData.name.trim().length === 0)
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Name must be a non-empty string",
        code: "INVALID_NAME",
      };
      return c.json(response, 400);
    }

    // Validate avatar URL if provided
    if (updateData.avatar && typeof updateData.avatar !== "string") {
      const response: ApiResponse = {
        success: false,
        error: "Avatar must be a valid URL string",
        code: "INVALID_AVATAR",
      };
      return c.json(response, 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        updatedAt: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error updating user profile:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update user profile",
      code: "PROFILE_UPDATE_ERROR",
    };
    return c.json(response, 500);
  }
});

// Get current session info
userRoutes.get("/session", authMiddleware, async (c) => {
  try {
    const session = c.get("session");
    const user = c.get("user");

    const response: ApiResponse = {
      success: true,
      data: {
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching session info:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch session info",
      code: "SESSION_FETCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Refresh session (extend expiration)
userRoutes.post("/session/refresh", authMiddleware, async (c) => {
  try {
    const headers = new Headers();
    Object.entries(c.req.header()).forEach(([key, value]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) {
        headers.set(key.toLowerCase(), headerValue);
      }
    });

    // Use Better Auth to refresh the session
    const refreshedSession = await auth.api.getSession({ headers });

    if (!refreshedSession) {
      const response: ApiResponse = {
        success: false,
        error: "Failed to refresh session",
        code: "SESSION_REFRESH_FAILED",
      };
      return c.json(response, 401);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        session: {
          id: refreshedSession.session.id,
          expiresAt: refreshedSession.session.expiresAt,
          updatedAt: refreshedSession.session.updatedAt,
        },
      },
      message: "Session refreshed successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error refreshing session:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to refresh session",
      code: "SESSION_REFRESH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Delete user account (with confirmation)
userRoutes.delete("/account", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Require confirmation
    if (body.confirm !== true) {
      const response: ApiResponse = {
        success: false,
        error: "Account deletion requires confirmation",
        code: "CONFIRMATION_REQUIRED",
      };
      return c.json(response, 400);
    }

    // Check if user is the sole admin of any households
    const adminHouseholds = await prisma.householdMember.findMany({
      where: {
        userId: user.id,
        role: "ADMIN",
      },
      include: {
        household: {
          include: {
            members: {
              where: {
                role: "ADMIN",
              },
            },
          },
        },
      },
    });

    const soleAdminHouseholds = adminHouseholds.filter(
      (member: any) => member.household.members.length === 1
    );

    if (soleAdminHouseholds.length > 0) {
      const response: ApiResponse = {
        success: false,
        error:
          "Cannot delete account while being the sole admin of households. Please transfer ownership or delete the households first.",
        code: "SOLE_ADMIN_CONSTRAINT",
        details: {
          households: soleAdminHouseholds.map(
            (member: any) => member.household.name
          ),
        },
      };
      return c.json(response, 400);
    }

    // Delete user account (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Revoke all sessions for this user
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
      message: "Account deleted successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error deleting user account:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete account",
      code: "ACCOUNT_DELETE_ERROR",
    };
    return c.json(response, 500);
  }
});

export { userRoutes };
