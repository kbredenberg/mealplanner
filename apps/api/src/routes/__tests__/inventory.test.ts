import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { inventoryRoutes } from "../inventory.js";

// Mock user and household data
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHousehold = {
  id: "test-household-id",
  name: "Test Household",
  description: "Test household description",
  createdAt: new Date(),
  updatedAt: new Date(),
  creatorId: mockUser.id,
};

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    inventoryItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock middleware
vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("user", mockUser);
    await next();
  },
  householdAccessMiddleware: async (c: any, next: any) => {
    c.set("household", mockHousehold);
    c.set("householdRole", "ADMIN");
    await next();
  },
}));

// Create test app
const app = new Hono();
app.route("/api/households", inventoryRoutes);

const client = testClient(app);

describe("Inventory API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /:householdId/inventory", () => {
    it("should return inventory items with pagination", async () => {
      const mockItems = [
        {
          id: "item-1",
          name: "Apples",
          quantity: 5,
          unit: "pieces",
          category: "Fruits",
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: mockHousehold.id,
        },
        {
          id: "item-2",
          name: "Milk",
          quantity: 1,
          unit: "liter",
          category: "Dairy",
          expiryDate: new Date("2024-01-15"),
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: mockHousehold.id,
        },
      ];

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.count as any).mockResolvedValue(2);
      (prisma.inventoryItem.findMany as any).mockResolvedValue(mockItems);

      const response = await client.api.households[
        ":householdId"
      ].inventory.$get({
        param: { householdId: mockHousehold.id },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
    });

    it("should filter by category", async () => {
      const mockItems = [
        {
          id: "item-1",
          name: "Apples",
          quantity: 5,
          unit: "pieces",
          category: "Fruits",
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: mockHousehold.id,
        },
      ];

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.count as any).mockResolvedValue(1);
      (prisma.inventoryItem.findMany as any).mockResolvedValue(mockItems);

      const response = await client.api.households[
        ":householdId"
      ].inventory.$get({
        param: { householdId: mockHousehold.id },
        query: { category: "Fruits" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].category).toBe("Fruits");
    });
  });

  describe("POST /:householdId/inventory", () => {
    it("should create a new inventory item", async () => {
      const newItem = {
        name: "Bananas",
        quantity: 6,
        unit: "pieces",
        category: "Fruits",
        expiryDate: "2024-01-20",
      };

      const mockCreatedItem = {
        id: "new-item-id",
        name: "Bananas",
        quantity: 6,
        unit: "pieces",
        category: "Fruits",
        expiryDate: new Date("2024-01-20"),
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: mockHousehold.id,
      };

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(null); // No duplicate
      (prisma.inventoryItem.create as any).mockResolvedValue(mockCreatedItem);

      const response = await client.api.households[
        ":householdId"
      ].inventory.$post({
        param: { householdId: mockHousehold.id },
        json: newItem,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Bananas");
      expect(data.message).toBe("Inventory item created successfully");
    });

    it("should reject invalid data", async () => {
      const invalidItem = {
        name: "",
        quantity: -1,
        unit: "",
        category: "",
      };

      const response = await client.api.households[
        ":householdId"
      ].inventory.$post({
        param: { householdId: mockHousehold.id },
        json: invalidItem,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_ITEM_NAME");
    });
  });

  describe("GET /:householdId/inventory/:itemId", () => {
    it("should return a specific inventory item", async () => {
      const mockItem = {
        id: "item-1",
        name: "Apples",
        quantity: 5,
        unit: "pieces",
        category: "Fruits",
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: mockHousehold.id,
      };

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(mockItem);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$get({
        param: { householdId: mockHousehold.id, itemId: "item-1" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("item-1");
    });

    it("should return 404 for non-existent item", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(null);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$get({
        param: { householdId: mockHousehold.id, itemId: "non-existent" },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVENTORY_ITEM_NOT_FOUND");
    });
  });

  describe("PATCH /:householdId/inventory/:itemId/quantity", () => {
    it("should update item quantity", async () => {
      const existingItem = {
        id: "item-1",
        name: "Apples",
        quantity: 5,
        unit: "pieces",
        category: "Fruits",
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: mockHousehold.id,
      };

      const updatedItem = {
        ...existingItem,
        quantity: 10,
        updatedAt: new Date(),
      };

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(existingItem);
      (prisma.inventoryItem.update as any).mockResolvedValue(updatedItem);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].quantity.$patch({
        param: { householdId: mockHousehold.id, itemId: "item-1" },
        json: { quantity: 10 },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.quantity).toBe(10);
    });

    it("should reject negative quantities", async () => {
      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].quantity.$patch({
        param: { householdId: mockHousehold.id, itemId: "item-1" },
        json: { quantity: -5 },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_QUANTITY");
    });
  });

  describe("GET /:householdId/inventory/categories", () => {
    it("should return unique categories", async () => {
      const mockCategories = [
        { category: "Fruits" },
        { category: "Dairy" },
        { category: "Vegetables" },
      ];

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findMany as any).mockResolvedValue(mockCategories);

      const response = await client.api.households[
        ":householdId"
      ].inventory.categories.$get({
        param: { householdId: mockHousehold.id },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(["Fruits", "Dairy", "Vegetables"]);
    });
  });

  describe("GET /:householdId/inventory/units", () => {
    it("should return unique units", async () => {
      const mockUnits = [{ unit: "pieces" }, { unit: "liter" }, { unit: "kg" }];

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findMany as any).mockResolvedValue(mockUnits);

      const response = await client.api.households[
        ":householdId"
      ].inventory.units.$get({
        param: { householdId: mockHousehold.id },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(["pieces", "liter", "kg"]);
    });
  });

  describe("GET /:householdId/inventory/search", () => {
    it("should search inventory items by name and category", async () => {
      const mockSearchResults = [
        {
          id: "item-1",
          name: "Apple Juice",
          quantity: 2,
          unit: "bottles",
          category: "Beverages",
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: mockHousehold.id,
        },
        {
          id: "item-2",
          name: "Green Apples",
          quantity: 5,
          unit: "pieces",
          category: "Fruits",
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          householdId: mockHousehold.id,
        },
      ];

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findMany as any).mockResolvedValue(
        mockSearchResults
      );

      const response = await client.api.households[
        ":householdId"
      ].inventory.search.$get({
        param: { householdId: mockHousehold.id },
        query: { q: "apple" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Apple Juice");
      expect(data.data[1].name).toBe("Green Apples");
    });

    it("should require search term", async () => {
      const response = await client.api.households[
        ":householdId"
      ].inventory.search.$get({
        param: { householdId: mockHousehold.id },
        query: { q: "" },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("MISSING_SEARCH_TERM");
    });
  });

  describe("PUT /:householdId/inventory/:itemId", () => {
    it("should update an inventory item", async () => {
      const existingItem = {
        id: "item-1",
        name: "Apples",
        quantity: 5,
        unit: "pieces",
        category: "Fruits",
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: mockHousehold.id,
      };

      const updatedItem = {
        ...existingItem,
        name: "Red Apples",
        quantity: 8,
        updatedAt: new Date(),
      };

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any)
        .mockResolvedValueOnce(existingItem) // First call for existence check
        .mockResolvedValueOnce(null); // Second call for duplicate name check
      (prisma.inventoryItem.update as any).mockResolvedValue(updatedItem);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$put({
        param: { householdId: mockHousehold.id, itemId: "item-1" },
        json: { name: "Red Apples", quantity: 8 },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Red Apples");
      expect(data.data.quantity).toBe(8);
    });

    it("should return 404 for non-existent item", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(null);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$put({
        param: { householdId: mockHousehold.id, itemId: "non-existent" },
        json: { name: "Updated Name" },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVENTORY_ITEM_NOT_FOUND");
    });
  });

  describe("DELETE /:householdId/inventory/:itemId", () => {
    it("should delete an inventory item", async () => {
      const existingItem = {
        id: "item-1",
        name: "Apples",
        quantity: 5,
        unit: "pieces",
        category: "Fruits",
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        householdId: mockHousehold.id,
      };

      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(existingItem);
      (prisma.inventoryItem.delete as any).mockResolvedValue(existingItem);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$delete({
        param: { householdId: mockHousehold.id, itemId: "item-1" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Inventory item deleted successfully");
    });

    it("should return 404 for non-existent item", async () => {
      const { prisma } = await import("../../lib/prisma.js");
      (prisma.inventoryItem.findFirst as any).mockResolvedValue(null);

      const response = await client.api.households[":householdId"].inventory[
        ":itemId"
      ].$delete({
        param: { householdId: mockHousehold.id, itemId: "non-existent" },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVENTORY_ITEM_NOT_FOUND");
    });
  });
});
