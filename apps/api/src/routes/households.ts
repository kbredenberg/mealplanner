import { Hono } from "hono";
import {
  authMiddleware,
  householdAccessMiddleware,
} from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import type { ApiResponse } from "../lib/types.js";
import "../lib/hono-types.js";

const householdRoutes = new Hono();

// Get all households for the current user
householdRoutes.get("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    const households = await prisma.householdMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            creatorId: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const response: ApiResponse = {
      success: true,
      data: households.map((member) => ({
        id: member.household.id,
        name: member.household.name,
        description: member.household.description,
        createdAt: member.household.createdAt,
        updatedAt: member.household.updatedAt,
        isCreator: member.household.creatorId === user.id,
        role: member.role,
        joinedAt: member.joinedAt,
        memberCount: member.household._count.members,
      })),
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching households:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch households",
      code: "HOUSEHOLDS_FETCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Create a new household
householdRoutes.post("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate input
    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim().length === 0
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Household name is required",
        code: "INVALID_HOUSEHOLD_NAME",
      };
      return c.json(response, 400);
    }

    if (body.name.trim().length > 100) {
      const response: ApiResponse = {
        success: false,
        error: "Household name must be 100 characters or less",
        code: "HOUSEHOLD_NAME_TOO_LONG",
      };
      return c.json(response, 400);
    }

    if (body.description && typeof body.description !== "string") {
      const response: ApiResponse = {
        success: false,
        error: "Description must be a string",
        code: "INVALID_DESCRIPTION",
      };
      return c.json(response, 400);
    }

    if (body.description && body.description.length > 500) {
      const response: ApiResponse = {
        success: false,
        error: "Description must be 500 characters or less",
        code: "DESCRIPTION_TOO_LONG",
      };
      return c.json(response, 400);
    }

    // Create household and add creator as admin
    const household = await prisma.household.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        creatorId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "ADMIN",
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        id: household.id,
        name: household.name,
        description: household.description,
        createdAt: household.createdAt,
        updatedAt: household.updatedAt,
        isCreator: true,
        role: "ADMIN",
        joinedAt: new Date(),
        memberCount: household._count.members,
      },
      message: "Household created successfully",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating household:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to create household",
      code: "HOUSEHOLD_CREATE_ERROR",
    };
    return c.json(response, 500);
  }
});

// Get specific household details
householdRoutes.get(
  "/:householdId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const user = c.get("user");
      const userRole = c.get("householdRole");

      const householdDetails = await prisma.household.findUnique({
        where: {
          id: household.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              inventory: true,
              shoppingList: true,
              mealPlans: true,
            },
          },
        },
      });

      if (!householdDetails) {
        const response: ApiResponse = {
          success: false,
          error: "Household not found",
          code: "HOUSEHOLD_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: householdDetails.id,
          name: householdDetails.name,
          description: householdDetails.description,
          createdAt: householdDetails.createdAt,
          updatedAt: householdDetails.updatedAt,
          creator: householdDetails.creator,
          isCreator: householdDetails.creatorId === user.id,
          userRole: userRole,
          stats: {
            memberCount: householdDetails._count.members,
            inventoryCount: householdDetails._count.inventory,
            shoppingListCount: householdDetails._count.shoppingList,
            mealPlanCount: householdDetails._count.mealPlans,
          },
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching household details:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch household details",
        code: "HOUSEHOLD_DETAILS_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update household details (admin only)
householdRoutes.put(
  "/:householdId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const userRole = c.get("householdRole");
      const body = await c.req.json();

      // Check if user is admin
      if (userRole !== "ADMIN") {
        const response: ApiResponse = {
          success: false,
          error: "Only household admins can update household details",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Validate input
      const updateData: { name?: string; description?: string | null } = {};

      if (body.name !== undefined) {
        if (
          !body.name ||
          typeof body.name !== "string" ||
          body.name.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Household name is required",
            code: "INVALID_HOUSEHOLD_NAME",
          };
          return c.json(response, 400);
        }

        if (body.name.trim().length > 100) {
          const response: ApiResponse = {
            success: false,
            error: "Household name must be 100 characters or less",
            code: "HOUSEHOLD_NAME_TOO_LONG",
          };
          return c.json(response, 400);
        }

        updateData.name = body.name.trim();
      }

      if (body.description !== undefined) {
        if (body.description && typeof body.description !== "string") {
          const response: ApiResponse = {
            success: false,
            error: "Description must be a string",
            code: "INVALID_DESCRIPTION",
          };
          return c.json(response, 400);
        }

        if (body.description && body.description.length > 500) {
          const response: ApiResponse = {
            success: false,
            error: "Description must be 500 characters or less",
            code: "DESCRIPTION_TOO_LONG",
          };
          return c.json(response, 400);
        }

        updateData.description = body.description?.trim() || null;
      }

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No valid fields to update",
          code: "NO_UPDATE_DATA",
        };
        return c.json(response, 400);
      }

      const updatedHousehold = await prisma.household.update({
        where: {
          id: household.id,
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
        },
      });

      const response: ApiResponse = {
        success: true,
        data: updatedHousehold,
        message: "Household updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating household:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update household",
        code: "HOUSEHOLD_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Delete household (creator only)
householdRoutes.delete(
  "/:householdId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const user = c.get("user");

      // Check if user is the creator
      if (household.creatorId !== user.id) {
        const response: ApiResponse = {
          success: false,
          error: "Only the household creator can delete the household",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Delete household (this will cascade delete all related records)
      await prisma.household.delete({
        where: {
          id: household.id,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Household deleted successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting household:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete household",
        code: "HOUSEHOLD_DELETE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

export { householdRoutes };
// Get household members
householdRoutes.get(
  "/:householdId/members",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");

      const members = await prisma.householdMember.findMany({
        where: {
          householdId: household.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: [
          { role: "desc" }, // Admins first
          { joinedAt: "asc" }, // Then by join date
        ],
      });

      const response: ApiResponse = {
        success: true,
        data: members.map((member) => ({
          id: member.id,
          user: member.user,
          role: member.role,
          joinedAt: member.joinedAt,
        })),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching household members:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch household members",
        code: "MEMBERS_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update member role (admin only)
householdRoutes.put(
  "/:householdId/members/:memberId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const user = c.get("user");
      const userRole = c.get("householdRole");
      const memberId = c.req.param("memberId");
      const body = await c.req.json();

      // Check if user is admin
      if (userRole !== "ADMIN") {
        const response: ApiResponse = {
          success: false,
          error: "Only household admins can update member roles",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Validate role
      if (!body.role || !["ADMIN", "MEMBER"].includes(body.role)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid role. Must be ADMIN or MEMBER",
          code: "INVALID_ROLE",
        };
        return c.json(response, 400);
      }

      // Find the member to update
      const memberToUpdate = await prisma.householdMember.findUnique({
        where: {
          id: memberId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!memberToUpdate || memberToUpdate.householdId !== household.id) {
        const response: ApiResponse = {
          success: false,
          error: "Member not found in this household",
          code: "MEMBER_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Prevent self-demotion if user is the only admin
      if (memberToUpdate.userId === user.id && body.role === "MEMBER") {
        const adminCount = await prisma.householdMember.count({
          where: {
            householdId: household.id,
            role: "ADMIN",
          },
        });

        if (adminCount === 1) {
          const response: ApiResponse = {
            success: false,
            error:
              "Cannot demote yourself as the only admin. Promote another member to admin first.",
            code: "LAST_ADMIN_CONSTRAINT",
          };
          return c.json(response, 400);
        }
      }

      // Update member role
      const updatedMember = await prisma.householdMember.update({
        where: {
          id: memberId,
        },
        data: {
          role: body.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updatedMember.id,
          user: updatedMember.user,
          role: updatedMember.role,
          joinedAt: updatedMember.joinedAt,
        },
        message: `Member role updated to ${body.role}`,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating member role:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update member role",
        code: "MEMBER_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Remove member from household (admin only, or self-removal)
householdRoutes.delete(
  "/:householdId/members/:memberId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const user = c.get("user");
      const userRole = c.get("householdRole");
      const memberId = c.req.param("memberId");

      // Find the member to remove
      const memberToRemove = await prisma.householdMember.findUnique({
        where: {
          id: memberId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!memberToRemove || memberToRemove.householdId !== household.id) {
        const response: ApiResponse = {
          success: false,
          error: "Member not found in this household",
          code: "MEMBER_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Check permissions: admin can remove anyone, or user can remove themselves
      const canRemove =
        userRole === "ADMIN" || memberToRemove.userId === user.id;

      if (!canRemove) {
        const response: ApiResponse = {
          success: false,
          error: "You can only remove yourself or be an admin to remove others",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Prevent removing the last admin
      if (memberToRemove.role === "ADMIN") {
        const adminCount = await prisma.householdMember.count({
          where: {
            householdId: household.id,
            role: "ADMIN",
          },
        });

        if (adminCount === 1) {
          const response: ApiResponse = {
            success: false,
            error:
              "Cannot remove the last admin. Promote another member to admin first or delete the household.",
            code: "LAST_ADMIN_CONSTRAINT",
          };
          return c.json(response, 400);
        }
      }

      // Remove member
      await prisma.householdMember.delete({
        where: {
          id: memberId,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the household`,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error removing member:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to remove member",
        code: "MEMBER_REMOVE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);
// Get household invites
householdRoutes.get(
  "/:householdId/invites",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const userRole = c.get("householdRole");

      // Only admins can view invites
      if (userRole !== "ADMIN") {
        const response: ApiResponse = {
          success: false,
          error: "Only household admins can view invites",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      const invites = await prisma.householdInvite.findMany({
        where: {
          householdId: household.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const response: ApiResponse = {
        success: true,
        data: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        })),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching invites:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch invites",
        code: "INVITES_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Send household invite (admin only)
householdRoutes.post(
  "/:householdId/invites",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const userRole = c.get("householdRole");
      const body = await c.req.json();

      // Only admins can send invites
      if (userRole !== "ADMIN") {
        const response: ApiResponse = {
          success: false,
          error: "Only household admins can send invites",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Validate input
      if (!body.email || typeof body.email !== "string") {
        const response: ApiResponse = {
          success: false,
          error: "Valid email address is required",
          code: "INVALID_EMAIL",
        };
        return c.json(response, 400);
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid email format",
          code: "INVALID_EMAIL_FORMAT",
        };
        return c.json(response, 400);
      }

      // Validate role
      const role = body.role || "MEMBER";
      if (!["ADMIN", "MEMBER"].includes(role)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid role. Must be ADMIN or MEMBER",
          code: "INVALID_ROLE",
        };
        return c.json(response, 400);
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: {
          email: body.email.toLowerCase(),
        },
      });

      if (existingUser) {
        const existingMember = await prisma.householdMember.findUnique({
          where: {
            userId_householdId: {
              userId: existingUser.id,
              householdId: household.id,
            },
          },
        });

        if (existingMember) {
          const response: ApiResponse = {
            success: false,
            error: "User is already a member of this household",
            code: "ALREADY_MEMBER",
          };
          return c.json(response, 400);
        }
      }

      // Check for existing pending invite
      const existingInvite = await prisma.householdInvite.findFirst({
        where: {
          email: body.email.toLowerCase(),
          householdId: household.id,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvite) {
        const response: ApiResponse = {
          success: false,
          error: "A pending invite already exists for this email",
          code: "INVITE_ALREADY_EXISTS",
        };
        return c.json(response, 400);
      }

      // Create invite (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await prisma.householdInvite.create({
        data: {
          email: body.email.toLowerCase(),
          role: role,
          householdId: household.id,
          expiresAt: expiresAt,
        },
      });

      // TODO: Send email notification (implement email service)
      // For now, we'll just return the invite details

      const response: ApiResponse = {
        success: true,
        data: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        },
        message: "Invite sent successfully",
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error sending invite:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to send invite",
        code: "INVITE_SEND_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Cancel/delete invite (admin only)
householdRoutes.delete(
  "/:householdId/invites/:inviteId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const userRole = c.get("householdRole");
      const inviteId = c.req.param("inviteId");

      // Only admins can cancel invites
      if (userRole !== "ADMIN") {
        const response: ApiResponse = {
          success: false,
          error: "Only household admins can cancel invites",
          code: "INSUFFICIENT_PERMISSIONS",
        };
        return c.json(response, 403);
      }

      // Find and delete the invite
      const invite = await prisma.householdInvite.findFirst({
        where: {
          id: inviteId,
          householdId: household.id,
        },
      });

      if (!invite) {
        const response: ApiResponse = {
          success: false,
          error: "Invite not found",
          code: "INVITE_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      await prisma.householdInvite.delete({
        where: {
          id: inviteId,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Invite cancelled successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error cancelling invite:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to cancel invite",
        code: "INVITE_CANCEL_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Accept household invite (public endpoint for invited users)
householdRoutes.post("/invites/:inviteId/accept", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const inviteId = c.req.param("inviteId");

    // Find the invite
    const invite = await prisma.householdInvite.findUnique({
      where: {
        id: inviteId,
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invite) {
      const response: ApiResponse = {
        success: false,
        error: "Invite not found",
        code: "INVITE_NOT_FOUND",
      };
      return c.json(response, 404);
    }

    // Check if invite is for the current user
    if (invite.email !== user.email) {
      const response: ApiResponse = {
        success: false,
        error: "This invite is not for your email address",
        code: "INVITE_EMAIL_MISMATCH",
      };
      return c.json(response, 403);
    }

    // Check if invite is still valid
    if (invite.status !== "PENDING") {
      const response: ApiResponse = {
        success: false,
        error: "This invite has already been processed",
        code: "INVITE_ALREADY_PROCESSED",
      };
      return c.json(response, 400);
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      await prisma.householdInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: "EXPIRED",
        },
      });

      const response: ApiResponse = {
        success: false,
        error: "This invite has expired",
        code: "INVITE_EXPIRED",
      };
      return c.json(response, 400);
    }

    // Check if user is already a member
    const existingMember = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: user.id,
          householdId: invite.householdId,
        },
      },
    });

    if (existingMember) {
      // Mark invite as accepted and return success
      await prisma.householdInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: "ACCEPTED",
        },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          household: invite.household,
          role: existingMember.role,
          joinedAt: existingMember.joinedAt,
        },
        message: "You are already a member of this household",
      };

      return c.json(response);
    }

    // Add user to household and mark invite as accepted
    const [member] = await prisma.$transaction([
      prisma.householdMember.create({
        data: {
          userId: user.id,
          householdId: invite.householdId,
          role: invite.role,
        },
      }),
      prisma.householdInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: "ACCEPTED",
        },
      }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        household: invite.household,
        role: member.role,
        joinedAt: member.joinedAt,
      },
      message: `Successfully joined ${invite.household.name}`,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error accepting invite:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to accept invite",
      code: "INVITE_ACCEPT_ERROR",
    };
    return c.json(response, 500);
  }
});

// Decline household invite (public endpoint for invited users)
householdRoutes.post(
  "/invites/:inviteId/decline",
  authMiddleware,
  async (c) => {
    try {
      const user = c.get("user");
      const inviteId = c.req.param("inviteId");

      // Find the invite
      const invite = await prisma.householdInvite.findUnique({
        where: {
          id: inviteId,
        },
      });

      if (!invite) {
        const response: ApiResponse = {
          success: false,
          error: "Invite not found",
          code: "INVITE_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Check if invite is for the current user
      if (invite.email !== user.email) {
        const response: ApiResponse = {
          success: false,
          error: "This invite is not for your email address",
          code: "INVITE_EMAIL_MISMATCH",
        };
        return c.json(response, 403);
      }

      // Check if invite is still pending
      if (invite.status !== "PENDING") {
        const response: ApiResponse = {
          success: false,
          error: "This invite has already been processed",
          code: "INVITE_ALREADY_PROCESSED",
        };
        return c.json(response, 400);
      }

      // Mark invite as declined
      await prisma.householdInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: "DECLINED",
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Invite declined successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error declining invite:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to decline invite",
        code: "INVITE_DECLINE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get user's pending invites (for the authenticated user)
householdRoutes.get("/invites/pending", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    const pendingInvites = await prisma.householdInvite.findMany({
      where: {
        email: user.email,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            description: true,
            creator: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const response: ApiResponse = {
      success: true,
      data: pendingInvites.map((invite) => ({
        id: invite.id,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        household: invite.household,
      })),
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching pending invites:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch pending invites",
      code: "PENDING_INVITES_ERROR",
    };
    return c.json(response, 500);
  }
});
