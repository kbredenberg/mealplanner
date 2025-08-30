import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { recipeRoutes } from "../recipes.js";

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

const mockRecipe = {
  id: "test-recipe-id",
  name: "Test Recipe",
  description: "A test recipe",
  instructions: "Mix ingredients and cook",
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  tags: ["dinner", "easy"],
  createdAt: new Date(),
  updatedAt: new Date(),
  creatorId: mockUser.id,
  creator: {
    id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
  },
  ingredients: [
    {
      id: "ingredient-1",
      quantity: 2,
      unit: "cups",
      notes: "Fresh preferred",
      recipeId: "test-recipe-id",
      inventoryItemId: "inventory-item-1",
      inventoryItem: {
        id: "inventory-item-1",
        name: "Flour",
        unit: "cups",
        category: "Baking",
      },
    },
  ],
  _count: {
    mealPlanItems: 0,
  },
};

const mockInventoryItem = {
  id: "inventory-item-1",
  name: "Flour",
  quantity: 5,
  unit: "cups",
  category: "Baking",
  expiryDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  householdId: mockHousehold.id,
};

// Mock Prisma
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    recipeIngredient: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    householdMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock middleware
vi.mock("../../lib/middleware.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("user", mockUser);
    await next();
  },
}));

// Import mocked prisma
import { prisma } from "../../lib/prisma.js";

// Create test app
const app = new Hono();
app.route("/", recipeRoutes);
const client = testClient(app);

describe("Recipe Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for household members
    (prisma.householdMember.findMany as any).mockResolvedValue([
      { householdId: mockHousehold.id },
    ]);
  });

  describe("GET /", () => {
    it("should fetch recipes successfully", async () => {
      (prisma.recipe.count as any).mockResolvedValue(1);
      (prisma.recipe.findMany as any).mockResolvedValue([mockRecipe]);

      const res = await client.index.$get({
        query: { page: "1", limit: "20" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Recipe");
      expect(data.pagination).toBeDefined();
    });

    it("should handle search query", async () => {
      (prisma.recipe.count as any).mockResolvedValue(1);
      (prisma.recipe.findMany as any).mockResolvedValue([mockRecipe]);

      const res = await client.index.$get({
        query: { search: "test", limit: "20" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({
                    name: { contains: "test", mode: "insensitive" },
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should handle tags filter", async () => {
      (prisma.recipe.count as any).mockResolvedValue(1);
      (prisma.recipe.findMany as any).mockResolvedValue([mockRecipe]);

      const res = await client.index.$get({
        query: { tags: "dinner,easy", limit: "20" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                tags: { hasSome: ["dinner", "easy"] },
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("GET /search", () => {
    it("should search recipes successfully", async () => {
      (prisma.recipe.findMany as any).mockResolvedValue([mockRecipe]);

      const res = await client.search.$get({
        query: { q: "test", limit: "20" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("should return error for missing search term", async () => {
      const res = await client.search.$get({
        query: { limit: "20" },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("MISSING_SEARCH_TERM");
    });
  });

  describe("GET /:recipeId", () => {
    it("should fetch recipe by ID successfully", async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(mockRecipe);

      const res = await client[":recipeId"].$get({
        param: { recipeId: "test-recipe-id" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe("Test Recipe");
    });

    it("should return 404 for non-existent recipe", async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(null);

      const res = await client[":recipeId"].$get({
        param: { recipeId: "non-existent-id" },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("RECIPE_NOT_FOUND");
    });
  });

  describe("POST /", () => {
    it("should create recipe successfully", async () => {
      const newRecipe = { ...mockRecipe, id: "new-recipe-id" };
      (prisma.$transaction as any).mockResolvedValue(newRecipe);
      (prisma.recipe.findUnique as any).mockResolvedValue(newRecipe);

      const recipeData = {
        name: "New Recipe",
        description: "A new test recipe",
        instructions: "Mix and cook",
        prepTime: 10,
        cookTime: 20,
        servings: 2,
        tags: ["quick", "easy"],
        ingredients: [
          {
            quantity: 1,
            unit: "cup",
            notes: "Fresh",
            inventoryItemId: "inventory-item-1",
          },
        ],
      };

      const res = await client.index.$post({
        json: recipeData,
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Recipe created successfully");
    });

    it("should validate required fields", async () => {
      const res = await client.index.$post({
        json: {
          description: "Missing name",
          instructions: "Mix and cook",
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_RECIPE_NAME");
    });

    it("should validate ingredients", async () => {
      const res = await client.index.$post({
        json: {
          name: "Test Recipe",
          instructions: "Mix and cook",
          ingredients: [], // Empty ingredients
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("MISSING_INGREDIENTS");
    });

    it("should validate ingredient quantity", async () => {
      const res = await client.index.$post({
        json: {
          name: "Test Recipe",
          instructions: "Mix and cook",
          ingredients: [
            {
              quantity: -1, // Invalid quantity
              unit: "cup",
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_INGREDIENT_QUANTITY");
    });
  });

  describe("PUT /:recipeId", () => {
    it("should update recipe successfully", async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(mockRecipe);
      (prisma.$transaction as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.findUnique as any).mockResolvedValue({
        ...mockRecipe,
        name: "Updated Recipe",
      });

      const updateData = {
        name: "Updated Recipe",
        description: "Updated description",
      };

      const res = await client[":recipeId"].$put({
        param: { recipeId: "test-recipe-id" },
        json: updateData,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Recipe updated successfully");
    });

    it("should return 404 for non-existent recipe", async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(null);

      const res = await client[":recipeId"].$put({
        param: { recipeId: "non-existent-id" },
        json: { name: "Updated Recipe" },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("RECIPE_NOT_FOUND_OR_NO_PERMISSION");
    });
  });

  describe("DELETE /:recipeId", () => {
    it("should delete recipe successfully", async () => {
      (prisma.recipe.findFirst as any).mockResolvedValue(mockRecipe);
      (prisma.recipe.delete as any).mockResolvedValue(mockRecipe);

      const res = await client[":recipeId"].$delete({
        param: { recipeId: "test-recipe-id" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Recipe deleted successfully");
    });

    it("should prevent deletion of recipe in use", async () => {
      const recipeInUse = { ...mockRecipe, _count: { mealPlanItems: 1 } };
      (prisma.recipe.findFirst as any).mockResolvedValue(recipeInUse);

      const res = await client[":recipeId"].$delete({
        param: { recipeId: "test-recipe-id" },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("RECIPE_IN_USE");
    });
  });

  describe("POST /:recipeId/validate-ingredients", () => {
    it("should validate ingredients successfully", async () => {
      (prisma.householdMember.findFirst as any).mockResolvedValue({
        userId: mockUser.id,
        householdId: mockHousehold.id,
      });
      (prisma.recipe.findFirst as any).mockResolvedValue(mockRecipe);
      (prisma.inventoryItem.findMany as any).mockResolvedValue([
        mockInventoryItem,
      ]);

      const res = await client[":recipeId"]["validate-ingredients"].$post({
        param: { recipeId: "test-recipe-id" },
        json: { householdId: mockHousehold.id },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.summary).toBeDefined();
      expect(data.data.ingredients).toBeDefined();
    });

    it("should return error for missing household ID", async () => {
      const res = await client[":recipeId"]["validate-ingredients"].$post({
        param: { recipeId: "test-recipe-id" },
        json: {},
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("MISSING_HOUSEHOLD_ID");
    });

    it("should return error for unauthorized household access", async () => {
      (prisma.householdMember.findFirst as any).mockResolvedValue(null);

      const res = await client[":recipeId"]["validate-ingredients"].$post({
        param: { recipeId: "test-recipe-id" },
        json: { householdId: "unauthorized-household-id" },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("HOUSEHOLD_ACCESS_DENIED");
    });
  });

  describe("GET /tags/list", () => {
    it("should fetch recipe tags successfully", async () => {
      (prisma.recipe.findMany as any).mockResolvedValue([
        { tags: ["dinner", "easy"] },
        { tags: ["breakfast", "quick"] },
        { tags: ["dinner", "healthy"] }, // duplicate "dinner"
      ]);

      const res = await client.tags.list.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([
        "breakfast",
        "dinner",
        "easy",
        "healthy",
        "quick",
      ]);
    });
  });
});
