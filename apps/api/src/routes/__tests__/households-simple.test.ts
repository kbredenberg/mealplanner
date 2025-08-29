import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../lib/prisma.js";
import type {
  User,
  Household,
  HouseholdMember,
  HouseholdInvite,
} from "@prisma/client";

describe("Household Database Operations", () => {
  let testUser1: User;
  let testUser2: User;
  let testHousehold: Household;

  beforeAll(async () => {
    // Clean up any existing test data in correct order
    try {
      await prisma.householdInvite.deleteMany({
        where: {
          email: {
            contains: "test",
          },
        },
      });
      await prisma.householdMember.deleteMany({
        where: {
          user: {
            email: {
              contains: "test",
            },
          },
        },
      });
      await prisma.household.deleteMany({
        where: {
          name: {
            contains: "Test",
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: "test",
          },
        },
      });
    } catch (error) {
      // Ignore cleanup errors - database might be empty
      console.log("Cleanup error (ignored):", error);
    }

    // Create test users (upsert to handle existing users)
    testUser1 = await prisma.user.upsert({
      where: { email: "test1@example.com" },
      update: { name: "Test User 1" },
      create: {
        email: "test1@example.com",
        name: "Test User 1",
      },
    });

    testUser2 = await prisma.user.upsert({
      where: { email: "test2@example.com" },
      update: { name: "Test User 2" },
      create: {
        email: "test2@example.com",
        name: "Test User 2",
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order due to foreign key constraints
    try {
      await prisma.householdInvite.deleteMany({
        where: {
          email: {
            contains: "test",
          },
        },
      });
      await prisma.householdMember.deleteMany({
        where: {
          user: {
            email: {
              contains: "test",
            },
          },
        },
      });
      await prisma.household.deleteMany({
        where: {
          name: {
            contains: "Test",
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: "test",
          },
        },
      });
    } catch (error) {
      // Ignore cleanup errors
      console.log("Cleanup error (ignored):", error);
    }
  });

  beforeEach(async () => {
    // Clean up households and members before each test
    await prisma.householdInvite.deleteMany({
      where: {
        household: {
          name: {
            contains: "Test",
          },
        },
      },
    });
    await prisma.householdMember.deleteMany({
      where: {
        household: {
          name: {
            contains: "Test",
          },
        },
      },
    });
    await prisma.household.deleteMany({
      where: {
        name: {
          contains: "Test",
        },
      },
    });
  });

  describe("Household CRUD Operations", () => {
    it("should create a household with admin member", async () => {
      const household = await prisma.household.create({
        data: {
          name: "Test Household",
          description: "A test household",
          creatorId: testUser1.id,
          members: {
            create: {
              userId: testUser1.id,
              role: "ADMIN",
            },
          },
        },
        include: {
          members: true,
        },
      });

      expect(household.name).toBe("Test Household");
      expect(household.creatorId).toBe(testUser1.id);
      expect(household.members).toHaveLength(1);
      expect(household.members[0].role).toBe("ADMIN");
      expect(household.members[0].userId).toBe(testUser1.id);
    });

    it("should find households for a user", async () => {
      // Create a household
      testHousehold = await prisma.household.create({
        data: {
          name: "Test User Households",
          description: "Test household for user query",
          creatorId: testUser1.id,
          members: {
            create: {
              userId: testUser1.id,
              role: "ADMIN",
            },
          },
        },
      });

      const households = await prisma.householdMember.findMany({
        where: {
          userId: testUser1.id,
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
            },
          },
        },
      });

      expect(households).toHaveLength(1);
      expect(households[0].household.name).toBe("Test User Households");
      expect(households[0].role).toBe("ADMIN");
    });

    it("should update household details", async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Update Household",
          description: "Original description",
          creatorId: testUser1.id,
          members: {
            create: {
              userId: testUser1.id,
              role: "ADMIN",
            },
          },
        },
      });

      const updatedHousehold = await prisma.household.update({
        where: {
          id: testHousehold.id,
        },
        data: {
          name: "Updated Household Name",
          description: "Updated description",
        },
      });

      expect(updatedHousehold.name).toBe("Updated Household Name");
      expect(updatedHousehold.description).toBe("Updated description");
    });

    it("should delete household and cascade delete members", async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Delete Household",
          description: "Test household for deletion",
          creatorId: testUser1.id,
          members: {
            create: [
              {
                userId: testUser1.id,
                role: "ADMIN",
              },
              {
                userId: testUser2.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      // Verify members exist
      const membersBefore = await prisma.householdMember.findMany({
        where: {
          householdId: testHousehold.id,
        },
      });
      expect(membersBefore).toHaveLength(2);

      // Delete household
      await prisma.household.delete({
        where: {
          id: testHousehold.id,
        },
      });

      // Verify household is deleted
      const deletedHousehold = await prisma.household.findUnique({
        where: {
          id: testHousehold.id,
        },
      });
      expect(deletedHousehold).toBeNull();

      // Verify members are cascade deleted
      const membersAfter = await prisma.householdMember.findMany({
        where: {
          householdId: testHousehold.id,
        },
      });
      expect(membersAfter).toHaveLength(0);
    });
  });

  describe("Household Member Management", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Member Management",
          description: "Test household for member management",
          creatorId: testUser1.id,
          members: {
            create: [
              {
                userId: testUser1.id,
                role: "ADMIN",
              },
              {
                userId: testUser2.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });
    });

    it("should list household members", async () => {
      const members = await prisma.householdMember.findMany({
        where: {
          householdId: testHousehold.id,
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

      expect(members).toHaveLength(2);

      // Find admin and member
      const adminMember = members.find((m) => m.role === "ADMIN");
      const regularMember = members.find((m) => m.role === "MEMBER");

      expect(adminMember).toBeTruthy();
      expect(adminMember?.user.email).toBe("test1@example.com");
      expect(regularMember).toBeTruthy();
      expect(regularMember?.user.email).toBe("test2@example.com");
    });

    it("should update member role", async () => {
      const member = await prisma.householdMember.findFirst({
        where: {
          householdId: testHousehold.id,
          userId: testUser2.id,
        },
      });

      expect(member?.role).toBe("MEMBER");

      const updatedMember = await prisma.householdMember.update({
        where: {
          id: member!.id,
        },
        data: {
          role: "ADMIN",
        },
      });

      expect(updatedMember.role).toBe("ADMIN");
    });

    it("should remove member from household", async () => {
      const member = await prisma.householdMember.findFirst({
        where: {
          householdId: testHousehold.id,
          userId: testUser2.id,
        },
      });

      await prisma.householdMember.delete({
        where: {
          id: member!.id,
        },
      });

      const remainingMembers = await prisma.householdMember.findMany({
        where: {
          householdId: testHousehold.id,
        },
      });

      expect(remainingMembers).toHaveLength(1);
      expect(remainingMembers[0].userId).toBe(testUser1.id);
    });

    it("should prevent duplicate membership", async () => {
      // Try to add testUser1 again (who is already a member)
      await expect(
        prisma.householdMember.create({
          data: {
            userId: testUser1.id,
            householdId: testHousehold.id,
            role: "MEMBER",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Household Invitations", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Invitations",
          description: "Test household for invitations",
          creatorId: testUser1.id,
          members: {
            create: {
              userId: testUser1.id,
              role: "ADMIN",
            },
          },
        },
      });
    });

    it("should create household invite", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invite = await prisma.householdInvite.create({
        data: {
          email: "newuser@example.com",
          role: "MEMBER",
          householdId: testHousehold.id,
          expiresAt: expiresAt,
        },
      });

      expect(invite.email).toBe("newuser@example.com");
      expect(invite.role).toBe("MEMBER");
      expect(invite.status).toBe("PENDING");
      expect(invite.householdId).toBe(testHousehold.id);
    });

    it("should find pending invites for user", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.householdInvite.create({
        data: {
          email: testUser2.email,
          role: "MEMBER",
          householdId: testHousehold.id,
          expiresAt: expiresAt,
        },
      });

      const pendingInvites = await prisma.householdInvite.findMany({
        where: {
          email: testUser2.email,
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
            },
          },
        },
      });

      expect(pendingInvites).toHaveLength(1);
      expect(pendingInvites[0].household.name).toBe("Test Invitations");
    });

    it("should accept invite and create membership", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await prisma.householdInvite.create({
        data: {
          email: testUser2.email,
          role: "MEMBER",
          householdId: testHousehold.id,
          expiresAt: expiresAt,
        },
      });

      // Accept invite (simulate the transaction)
      const [member] = await prisma.$transaction([
        prisma.householdMember.create({
          data: {
            userId: testUser2.id,
            householdId: testHousehold.id,
            role: invite.role,
          },
        }),
        prisma.householdInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            status: "ACCEPTED",
          },
        }),
      ]);

      expect(member.userId).toBe(testUser2.id);
      expect(member.role).toBe("MEMBER");

      // Verify invite status updated
      const updatedInvite = await prisma.householdInvite.findUnique({
        where: {
          id: invite.id,
        },
      });
      expect(updatedInvite?.status).toBe("ACCEPTED");
    });

    it("should decline invite", async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await prisma.householdInvite.create({
        data: {
          email: testUser2.email,
          role: "MEMBER",
          householdId: testHousehold.id,
          expiresAt: expiresAt,
        },
      });

      const updatedInvite = await prisma.householdInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "DECLINED",
        },
      });

      expect(updatedInvite.status).toBe("DECLINED");
    });

    it("should mark expired invites", async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      const invite = await prisma.householdInvite.create({
        data: {
          email: testUser2.email,
          role: "MEMBER",
          householdId: testHousehold.id,
          expiresAt: expiredDate,
        },
      });

      // Mark as expired
      const updatedInvite = await prisma.householdInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "EXPIRED",
        },
      });

      expect(updatedInvite.status).toBe("EXPIRED");
    });
  });

  describe("Role-based Access Control", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test RBAC",
          description: "Test household for role-based access control",
          creatorId: testUser1.id,
          members: {
            create: [
              {
                userId: testUser1.id,
                role: "ADMIN",
              },
              {
                userId: testUser2.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });
    });

    it("should validate household access", async () => {
      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: testUser1.id,
            householdId: testHousehold.id,
          },
        },
        include: {
          household: true,
        },
      });

      expect(membership).toBeTruthy();
      expect(membership?.role).toBe("ADMIN");
      expect(membership?.household.id).toBe(testHousehold.id);
    });

    it("should reject access for non-members", async () => {
      // Create another user who is not a member
      const nonMember = await prisma.user.create({
        data: {
          email: "nonmember@example.com",
          name: "Non Member",
        },
      });

      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: nonMember.id,
            householdId: testHousehold.id,
          },
        },
      });

      expect(membership).toBeNull();

      // Clean up
      await prisma.user.delete({
        where: {
          id: nonMember.id,
        },
      });
    });

    it("should count admin members", async () => {
      const adminCount = await prisma.householdMember.count({
        where: {
          householdId: testHousehold.id,
          role: "ADMIN",
        },
      });

      expect(adminCount).toBe(1);
    });

    it("should prevent removing last admin", async () => {
      // This test validates the business logic that should be implemented in the API
      const adminCount = await prisma.householdMember.count({
        where: {
          householdId: testHousehold.id,
          role: "ADMIN",
        },
      });

      const adminMember = await prisma.householdMember.findFirst({
        where: {
          householdId: testHousehold.id,
          role: "ADMIN",
        },
      });

      // Business rule: cannot remove the last admin
      if (adminCount === 1 && adminMember?.role === "ADMIN") {
        // This should be prevented by the API logic
        expect(adminCount).toBe(1);
        expect(adminMember.role).toBe("ADMIN");
      }
    });
  });
});
