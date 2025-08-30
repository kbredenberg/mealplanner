import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";

// Test data
const testUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testHousehold = {
  id: "test-household-id",
  name: "Test Household",
  description: "Test household description",
  createdAt: new Date(),
  updatedAt: new Date(),
  creatorId: testUser.id,
};

// Mock middleware
const mockAuthMiddleware = (c: any, next: any) => {
  c.set("user", testUser);
  return next();
};

const mockHouseholdAccessMiddleware = (c: any, next: any) => {
  c.set("household", testHousehold);
  c.set("householdRole", "ADMIN");
  return next();
};

// Mock the WebSocket manager
const mockWsManager = {
  broadcastToHousehold: vi.fn(),
};

// Mock modules
vi.mock("../../lib/websocket.js", () => ({
  wsManager: mockWsManager,
}));

vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: mockAuthMiddleware,
  householdAccessMiddleware: mockHouseholdAccessMiddleware,
}));

// Import after mocking
const { shoppingListRoutes } = await import("../shopping-list.js");

// Create test app
const app = new Hono();
app.route("/api/households", shoppingListRoutes);

describe("Shopping List API", () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.shoppingListItem.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.inventoryItem.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.householdMember.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.household.deleteMany({
      where: { id: testHousehold.id },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });

    // Create test user and household
    await prisma.user.create({
      data: testUser,
    });
    await prisma.household.create({
      data: testHousehold,
    });
    await prisma.householdMember.create({
      data: {
        userId: testUser.id,
        householdId: testHousehold.id,
        role: "ADMIN",
      },
    });

    // Reset mock calls
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.shoppingListItem.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.inventoryItem.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.householdMember.deleteMany({
      where: { householdId: testHousehold.id },
    });
    await prisma.household.deleteMany({
      where: { id: testHousehold.id },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  describe("GET /api/households/:householdId/shopping-list", () => {
    it("should return empty shopping list for new household", async () => {
      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it("should return shopping list items with pagination", async () => {
      // Create test items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Apples",
            quantity: 5,
            unit: "pieces",
            category: "Fruits",
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            quantity: 1,
            unit: "liter",
            category: "Dairy",
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it("should filter by category", async () => {
      // Create test items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Apples",
            category: "Fruits",
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            category: "Dairy",
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list?category=Fruits`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Apples");
    });

    it("should filter by completion status", async () => {
      // Create test items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Apples",
            completed: false,
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            completed: true,
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list?completed=true`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Milk");
      expect(data.data[0].completed).toBe(true);
    });

    it("should search by name", async () => {
      // Create test items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Green Apples",
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list?search=apple`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Green Apples");
    });
  });

  describe("POST /api/households/:householdId/shopping-list", () => {
    it("should create a new shopping list item", async () => {
      const itemData = {
        name: "Bananas",
        quantity: 6,
        unit: "pieces",
        category: "Fruits",
      };

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Bananas");
      expect(data.data.quantity).toBe(6);
      expect(data.data.unit).toBe("pieces");
      expect(data.data.category).toBe("Fruits");
      expect(data.data.completed).toBe(false);

      // Verify WebSocket broadcast was called
      expect(mockWsManager.broadcastToHousehold).toHaveBeenCalledWith(
        testHousehold.id,
        "shopping-list:item-added",
        expect.objectContaining({
          householdId: testHousehold.id,
          item: expect.objectContaining({
            name: "Bananas",
          }),
        })
      );
    });

    it("should create item with minimal data", async () => {
      const itemData = {
        name: "Bread",
      };

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Bread");
      expect(data.data.quantity).toBeNull();
      expect(data.data.unit).toBeNull();
      expect(data.data.category).toBeNull();
    });

    it("should reject invalid data", async () => {
      const itemData = {
        name: "", // Empty name
        quantity: -1, // Negative quantity
      };

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_ITEM_NAME");
    });

    it("should reject invalid quantity", async () => {
      const itemData = {
        name: "Test Item",
        quantity: -5,
      };

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_QUANTITY");
    });
  });

  describe("GET /api/households/:householdId/shopping-list/categories", () => {
    it("should return unique categories", async () => {
      // Create test items with categories
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Apples",
            category: "Fruits",
            householdId: testHousehold.id,
          },
          {
            name: "Bananas",
            category: "Fruits",
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            category: "Dairy",
            householdId: testHousehold.id,
          },
          {
            name: "Bread",
            category: null, // No category
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/categories`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(["Dairy", "Fruits"]);
    });
  });

  describe("GET /api/households/:householdId/shopping-list/search", () => {
    it("should search shopping list items", async () => {
      // Create test items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Green Apples",
            category: "Fruits",
            householdId: testHousehold.id,
          },
          {
            name: "Apple Juice",
            category: "Beverages",
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            category: "Dairy",
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/search?q=apple`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data.map((item: any) => item.name)).toEqual([
        "Apple Juice",
        "Green Apples",
      ]);
    });

    it("should require search term", async () => {
      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/search`
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("MISSING_SEARCH_TERM");
    });
  });

  describe("PATCH /api/households/:householdId/shopping-list/:itemId/toggle", () => {
    it("should toggle completion status", async () => {
      // Create test item
      const item = await prisma.shoppingListItem.create({
        data: {
          name: "Apples",
          completed: false,
          householdId: testHousehold.id,
        },
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/${item.id}/toggle`,
        {
          method: "PATCH",
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.completed).toBe(true);

      // Verify WebSocket broadcast was called
      expect(mockWsManager.broadcastToHousehold).toHaveBeenCalledWith(
        testHousehold.id,
        "shopping-list:item-completed",
        expect.objectContaining({
          householdId: testHousehold.id,
          item: expect.objectContaining({
            completed: true,
          }),
        })
      );
    });

    it("should toggle from completed to incomplete", async () => {
      // Create completed test item
      const item = await prisma.shoppingListItem.create({
        data: {
          name: "Apples",
          completed: true,
          householdId: testHousehold.id,
        },
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/${item.id}/toggle`,
        {
          method: "PATCH",
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.completed).toBe(false);
    });
  });

  describe("DELETE /api/households/:householdId/shopping-list/:itemId", () => {
    it("should delete shopping list item", async () => {
      // Create test item
      const item = await prisma.shoppingListItem.create({
        data: {
          name: "Apples",
          householdId: testHousehold.id,
        },
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/${item.id}`,
        {
          method: "DELETE",
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify item is deleted
      const deletedItem = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(deletedItem).toBeNull();

      // Verify WebSocket broadcast was called
      expect(mockWsManager.broadcastToHousehold).toHaveBeenCalledWith(
        testHousehold.id,
        "shopping-list:item-deleted",
        expect.objectContaining({
          householdId: testHousehold.id,
          itemId: item.id,
        })
      );
    });

    it("should return 404 for non-existent item", async () => {
      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/non-existent-id`,
        {
          method: "DELETE",
        }
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("SHOPPING_LIST_ITEM_NOT_FOUND");
    });
  });

  describe("POST /api/households/:householdId/shopping-list/convert-to-inventory", () => {
    it("should convert completed items to inventory", async () => {
      // Create completed shopping list items
      await prisma.shoppingListItem.createMany({
        data: [
          {
            name: "Apples",
            quantity: 5,
            unit: "pieces",
            category: "Fruits",
            completed: true,
            householdId: testHousehold.id,
          },
          {
            name: "Milk",
            quantity: 1,
            unit: "liter",
            category: "Dairy",
            completed: true,
            householdId: testHousehold.id,
          },
          {
            name: "Bread",
            completed: false, // Not completed, should not be converted
            householdId: testHousehold.id,
          },
        ],
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/convert-to-inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ convertAllCompleted: true }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.summary.totalConverted).toBe(2);

      // Verify inventory items were created
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: { householdId: testHousehold.id },
      });
      expect(inventoryItems).toHaveLength(2);

      // Verify shopping list items were deleted
      const remainingShoppingItems = await prisma.shoppingListItem.findMany({
        where: { householdId: testHousehold.id },
      });
      expect(remainingShoppingItems).toHaveLength(1); // Only the incomplete item should remain
      expect(remainingShoppingItems[0].name).toBe("Bread");
    });

    it("should handle existing inventory items by updating quantity", async () => {
      // Create existing inventory item
      await prisma.inventoryItem.create({
        data: {
          name: "Apples",
          quantity: 3,
          unit: "pieces",
          category: "Fruits",
          householdId: testHousehold.id,
        },
      });

      // Create shopping list item with same name
      const shoppingItem = await prisma.shoppingListItem.create({
        data: {
          name: "Apples",
          quantity: 5,
          unit: "pieces",
          category: "Fruits",
          completed: true,
          householdId: testHousehold.id,
        },
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/convert-to-inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: [shoppingItem.id] }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.summary.totalConverted).toBe(1);

      // Verify inventory quantity was updated
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { name: "Apples", householdId: testHousehold.id },
      });
      expect(inventoryItem?.quantity).toBe(8); // 3 + 5
    });

    it("should skip items with unit mismatch", async () => {
      // Create existing inventory item with different unit
      await prisma.inventoryItem.create({
        data: {
          name: "Apples",
          quantity: 3,
          unit: "kg",
          category: "Fruits",
          householdId: testHousehold.id,
        },
      });

      // Create shopping list item with different unit
      const shoppingItem = await prisma.shoppingListItem.create({
        data: {
          name: "Apples",
          quantity: 5,
          unit: "pieces",
          category: "Fruits",
          completed: true,
          householdId: testHousehold.id,
        },
      });

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/convert-to-inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: [shoppingItem.id] }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.summary.totalSkipped).toBe(1);
      expect(data.data.skipped[0].reason).toContain("Unit mismatch");
    });
  });

  describe("POST /api/households/:householdId/shopping-list/bulk", () => {
    it("should complete multiple items", async () => {
      // Create test items
      const items = await Promise.all([
        prisma.shoppingListItem.create({
          data: {
            name: "Apples",
            completed: false,
            householdId: testHousehold.id,
          },
        }),
        prisma.shoppingListItem.create({
          data: {
            name: "Milk",
            completed: false,
            householdId: testHousehold.id,
          },
        }),
      ]);

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            itemIds: items.map((item) => item.id),
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.affectedCount).toBe(2);

      // Verify items are completed
      const updatedItems = await prisma.shoppingListItem.findMany({
        where: { id: { in: items.map((item) => item.id) } },
      });
      expect(updatedItems.every((item) => item.completed)).toBe(true);

      // Verify WebSocket broadcast was called
      expect(mockWsManager.broadcastToHousehold).toHaveBeenCalledWith(
        testHousehold.id,
        "shopping-list:bulk-operation",
        expect.objectContaining({
          householdId: testHousehold.id,
          action: "complete",
          affectedCount: 2,
        })
      );
    });

    it("should delete multiple items", async () => {
      // Create test items
      const items = await Promise.all([
        prisma.shoppingListItem.create({
          data: {
            name: "Apples",
            householdId: testHousehold.id,
          },
        }),
        prisma.shoppingListItem.create({
          data: {
            name: "Milk",
            householdId: testHousehold.id,
          },
        }),
      ]);

      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            itemIds: items.map((item) => item.id),
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.affectedCount).toBe(2);

      // Verify items are deleted
      const remainingItems = await prisma.shoppingListItem.findMany({
        where: { id: { in: items.map((item) => item.id) } },
      });
      expect(remainingItems).toHaveLength(0);
    });

    it("should reject invalid action", async () => {
      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "invalid-action",
            itemIds: ["item1", "item2"],
          }),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_BULK_ACTION");
    });

    it("should reject empty item IDs", async () => {
      const res = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            itemIds: [],
          }),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_ITEM_IDS");
    });
  });
});
