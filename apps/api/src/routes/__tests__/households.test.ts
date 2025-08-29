import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { householdRoutes } from "../households.js";
import { prisma } from "../../lib/prisma.js";
import type {
  User,
  Household,
  HouseholdMember,
  HouseholdInvite,
} from "@prisma/client";

// Create a test app with the household routes
const app = new Hono();
app.route("/api/households", householdRoutes);

// Mock auth middleware to inject test user
const mockAuthMiddleware = (user: any) => async (c: any, next: any) => {
  c.set("user", user);
  await next();
};

// Mock household access middleware
const mockHouseholdAccessMiddleware =
  (household: any, role: string) => async (c: any, next: any) => {
    c.set("household", household);
    c.set("householdRole", role);
    await next();
  };

describe("Household Management API", () => {
  let testUser1: User;
  let testUser2: User;
  let testHousehold: Household;
  let testMember: HouseholdMember;

  beforeAll(async () => {
    // Clean up any existing test data
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

    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: "test1@example.com",
        name: "Test User 1",
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: "test2@example.com",
        name: "Test User 2",
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
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

  describe("GET /api/households", () => {
    it("should return empty array when user has no households", async () => {
      const client = testClient(app);

      // Mock auth middleware
      app.use("*", mockAuthMiddleware(testUser1));

      const res = await client.api.households.$get();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("should return user's households", async () => {
      // Create a test household
      testHousehold = await prisma.household.create({
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
      });

      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));

      const res = await client.api.households.$get();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Household");
      expect(data.data[0].role).toBe("ADMIN");
      expect(data.data[0].isCreator).toBe(true);
    });
  });

  describe("POST /api/households", () => {
    it("should create a new household", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));

      const householdData = {
        name: "New Test Household",
        description: "A new test household",
      };

      const res = await client.api.households.$post({
        json: householdData,
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(householdData.name);
      expect(data.data.description).toBe(householdData.description);
      expect(data.data.role).toBe("ADMIN");
      expect(data.data.isCreator).toBe(true);

      // Verify household was created in database
      const household = await prisma.household.findFirst({
        where: { name: householdData.name },
        include: { members: true },
      });

      expect(household).toBeTruthy();
      expect(household?.members).toHaveLength(1);
      expect(household?.members[0].role).toBe("ADMIN");
    });

    it("should reject invalid household name", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));

      const res = await client.api.households.$post({
        json: { name: "" },
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_HOUSEHOLD_NAME");
    });

    it("should reject household name that's too long", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));

      const longName = "a".repeat(101);
      const res = await client.api.households.$post({
        json: { name: longName },
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("HOUSEHOLD_NAME_TOO_LONG");
    });
  });

  describe("GET /api/households/:householdId", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Household Details",
          description: "Test household for details",
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

    it("should return household details", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));
      app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

      const res = await client.api.households[":householdId"].$get({
        param: { householdId: testHousehold.id },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Test Household Details");
      expect(data.data.userRole).toBe("ADMIN");
      expect(data.data.isCreator).toBe(true);
    });
  });

  describe("PUT /api/households/:householdId", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Household Update",
          description: "Test household for updates",
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

    it("should update household details as admin", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));
      app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

      const updateData = {
        name: "Updated Household Name",
        description: "Updated description",
      };

      const res = await client.api.households[":householdId"].$put({
        param: { householdId: testHousehold.id },
        json: updateData,
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
      expect(data.data.description).toBe(updateData.description);
    });

    it("should reject update from non-admin", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser2));
      app.use("*", mockHouseholdAccessMiddleware(testHousehold, "MEMBER"));

      const res = await client.api.households[":householdId"].$put({
        param: { householdId: testHousehold.id },
        json: { name: "Should not work" },
      });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INSUFFICIENT_PERMISSIONS");
    });
  });

  describe("DELETE /api/households/:householdId", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Household Delete",
          description: "Test household for deletion",
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

    it("should delete household as creator", async () => {
      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser1));
      app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

      const res = await client.api.households[":householdId"].$delete({
        param: { householdId: testHousehold.id },
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify household was deleted
      const deletedHousehold = await prisma.household.findUnique({
        where: { id: testHousehold.id },
      });
      expect(deletedHousehold).toBeNull();
    });

    it("should reject deletion from non-creator", async () => {
      // Add testUser2 as admin but not creator
      await prisma.householdMember.create({
        data: {
          userId: testUser2.id,
          householdId: testHousehold.id,
          role: "ADMIN",
        },
      });

      const client = testClient(app);
      app.use("*", mockAuthMiddleware(testUser2));
      app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

      const res = await client.api.households[":householdId"].$delete({
        param: { householdId: testHousehold.id },
      });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INSUFFICIENT_PERMISSIONS");
    });
  });

  describe("Household Members", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Household Members",
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

    describe("GET /api/households/:householdId/members", () => {
      it("should return household members", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].members.$get({
          param: { householdId: testHousehold.id },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(2);

        // Should be ordered by role (admins first) then join date
        expect(data.data[0].role).toBe("ADMIN");
        expect(data.data[1].role).toBe("MEMBER");
      });
    });

    describe("PUT /api/households/:householdId/members/:memberId", () => {
      it("should update member role as admin", async () => {
        const member = await prisma.householdMember.findFirst({
          where: {
            householdId: testHousehold.id,
            userId: testUser2.id,
          },
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].members[
          ":memberId"
        ].$put({
          param: {
            householdId: testHousehold.id,
            memberId: member!.id,
          },
          json: { role: "ADMIN" },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.role).toBe("ADMIN");
      });

      it("should prevent self-demotion as last admin", async () => {
        const adminMember = await prisma.householdMember.findFirst({
          where: {
            householdId: testHousehold.id,
            userId: testUser1.id,
          },
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].members[
          ":memberId"
        ].$put({
          param: {
            householdId: testHousehold.id,
            memberId: adminMember!.id,
          },
          json: { role: "MEMBER" },
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe("LAST_ADMIN_CONSTRAINT");
      });
    });

    describe("DELETE /api/households/:householdId/members/:memberId", () => {
      it("should remove member as admin", async () => {
        const member = await prisma.householdMember.findFirst({
          where: {
            householdId: testHousehold.id,
            userId: testUser2.id,
          },
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].members[
          ":memberId"
        ].$delete({
          param: {
            householdId: testHousehold.id,
            memberId: member!.id,
          },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify member was removed
        const removedMember = await prisma.householdMember.findUnique({
          where: { id: member!.id },
        });
        expect(removedMember).toBeNull();
      });

      it("should allow self-removal", async () => {
        const member = await prisma.householdMember.findFirst({
          where: {
            householdId: testHousehold.id,
            userId: testUser2.id,
          },
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "MEMBER"));

        const res = await client.api.households[":householdId"].members[
          ":memberId"
        ].$delete({
          param: {
            householdId: testHousehold.id,
            memberId: member!.id,
          },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it("should prevent removing last admin", async () => {
        const adminMember = await prisma.householdMember.findFirst({
          where: {
            householdId: testHousehold.id,
            userId: testUser1.id,
          },
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].members[
          ":memberId"
        ].$delete({
          param: {
            householdId: testHousehold.id,
            memberId: adminMember!.id,
          },
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe("LAST_ADMIN_CONSTRAINT");
      });
    });
  });

  describe("Household Invites", () => {
    beforeEach(async () => {
      testHousehold = await prisma.household.create({
        data: {
          name: "Test Household Invites",
          description: "Test household for invite management",
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

    describe("POST /api/households/:householdId/invites", () => {
      it("should send invite as admin", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const inviteData = {
          email: "newuser@example.com",
          role: "MEMBER",
        };

        const res = await client.api.households[":householdId"].invites.$post({
          param: { householdId: testHousehold.id },
          json: inviteData,
        });
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.email).toBe(inviteData.email);
        expect(data.data.role).toBe(inviteData.role);
        expect(data.data.status).toBe("PENDING");

        // Verify invite was created in database
        const invite = await prisma.householdInvite.findFirst({
          where: {
            email: inviteData.email,
            householdId: testHousehold.id,
          },
        });
        expect(invite).toBeTruthy();
      });

      it("should reject invite for existing member", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].invites.$post({
          param: { householdId: testHousehold.id },
          json: { email: testUser1.email, role: "MEMBER" },
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe("ALREADY_MEMBER");
      });

      it("should reject invalid email", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].invites.$post({
          param: { householdId: testHousehold.id },
          json: { email: "invalid-email", role: "MEMBER" },
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe("INVALID_EMAIL_FORMAT");
      });

      it("should reject invite from non-admin", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "MEMBER"));

        const res = await client.api.households[":householdId"].invites.$post({
          param: { householdId: testHousehold.id },
          json: { email: "newuser@example.com", role: "MEMBER" },
        });
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.code).toBe("INSUFFICIENT_PERMISSIONS");
      });
    });

    describe("GET /api/households/:householdId/invites", () => {
      beforeEach(async () => {
        await prisma.householdInvite.create({
          data: {
            email: "invited@example.com",
            role: "MEMBER",
            householdId: testHousehold.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      });

      it("should return invites as admin", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "ADMIN"));

        const res = await client.api.households[":householdId"].invites.$get({
          param: { householdId: testHousehold.id },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].email).toBe("invited@example.com");
      });

      it("should reject access from non-admin", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));
        app.use("*", mockHouseholdAccessMiddleware(testHousehold, "MEMBER"));

        const res = await client.api.households[":householdId"].invites.$get({
          param: { householdId: testHousehold.id },
        });
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.code).toBe("INSUFFICIENT_PERMISSIONS");
      });
    });

    describe("POST /api/households/invites/:inviteId/accept", () => {
      let testInvite: HouseholdInvite;

      beforeEach(async () => {
        testInvite = await prisma.householdInvite.create({
          data: {
            email: testUser2.email,
            role: "MEMBER",
            householdId: testHousehold.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      });

      it("should accept valid invite", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));

        const res = await client.api.households.invites[
          ":inviteId"
        ].accept.$post({
          param: { inviteId: testInvite.id },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.role).toBe("MEMBER");

        // Verify member was added
        const member = await prisma.householdMember.findUnique({
          where: {
            userId_householdId: {
              userId: testUser2.id,
              householdId: testHousehold.id,
            },
          },
        });
        expect(member).toBeTruthy();

        // Verify invite was marked as accepted
        const updatedInvite = await prisma.householdInvite.findUnique({
          where: { id: testInvite.id },
        });
        expect(updatedInvite?.status).toBe("ACCEPTED");
      });

      it("should reject invite for wrong user", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));

        const res = await client.api.households.invites[
          ":inviteId"
        ].accept.$post({
          param: { inviteId: testInvite.id },
        });
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.code).toBe("INVITE_EMAIL_MISMATCH");
      });

      it("should reject expired invite", async () => {
        // Update invite to be expired
        await prisma.householdInvite.update({
          where: { id: testInvite.id },
          data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
        });

        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));

        const res = await client.api.households.invites[
          ":inviteId"
        ].accept.$post({
          param: { inviteId: testInvite.id },
        });
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe("INVITE_EXPIRED");
      });
    });

    describe("POST /api/households/invites/:inviteId/decline", () => {
      let testInvite: HouseholdInvite;

      beforeEach(async () => {
        testInvite = await prisma.householdInvite.create({
          data: {
            email: testUser2.email,
            role: "MEMBER",
            householdId: testHousehold.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      });

      it("should decline valid invite", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));

        const res = await client.api.households.invites[
          ":inviteId"
        ].decline.$post({
          param: { inviteId: testInvite.id },
        });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify invite was marked as declined
        const updatedInvite = await prisma.householdInvite.findUnique({
          where: { id: testInvite.id },
        });
        expect(updatedInvite?.status).toBe("DECLINED");
      });
    });

    describe("GET /api/households/invites/pending", () => {
      beforeEach(async () => {
        await prisma.householdInvite.create({
          data: {
            email: testUser2.email,
            role: "MEMBER",
            householdId: testHousehold.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      });

      it("should return pending invites for user", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser2));

        const res = await client.api.households.invites.pending.$get();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].role).toBe("MEMBER");
        expect(data.data[0].household.name).toBe("Test Household Invites");
      });

      it("should return empty array when no pending invites", async () => {
        const client = testClient(app);
        app.use("*", mockAuthMiddleware(testUser1));

        const res = await client.api.households.invites.pending.$get();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toEqual([]);
      });
    });
  });
});
