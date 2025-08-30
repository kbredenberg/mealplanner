import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";

// Mock Prisma first
const mockPrisma = {
  mealPlan: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mealPlanItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  recipe: {
    findUnique: vi.fn(),
  },
  inventoryItem: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  shoppingListItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

// Mock WebSocket manager
const mockWsManager = {
  broadcastToHousehold: vi.fn(),
};

vi.mock("../../lib/websocket.js", () => ({
  wsManager: mockWsManager,
}));

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

import { mealPlanRoutes } from "../meal-plans.js";

const mockMealPlan = {
  id: "test-meal-plan-id",
  weekStart: new Date("2024-01-01"),
  weekEnd: new Date("2024-01-07"),
  createdAt: new Date(),
  updatedAt: new Date(),
  householdId: mockHousehold.id,
  meals: [],
};

const mockRecipe = {
  id: "test-recipe-id",
  name: "Test Recipe",
  description: "A test recipe",
  instructions: "Test instructions",
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  tags: ["test"],
  creatorId: mockUser.id,
  ingredients: [
    {
      id: "ingredient-1",
      quantity: 2,
      unit: "cups",
      inventoryItem: {
        id: "inventory-1",
        name: "Test Ingredient 1",
        category: "Test Category",
      },
    },
  ],
};

// Create test app
const app = new Hono();
app.route("/", mealPlanRoutes);

describe("Meal Plans API - Core Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /:householdId/meal-plans", () => {
    it("should return meal plans for household", async () => {
      mockPrisma.mealPlan.count.mockResolvedValue(1);
      mockPrisma.mealPlan.findMany.mockResolvedValue([mockMealPlan]);

      const res = await app.request(`/test-household-id/meal-plans`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([mockMealPlan]);
    });
  });

  describe("POST /:householdId/meal-plans", () => {
    it("should create a new meal plan", async () => {
      mockPrisma.mealPlan.findFirst.mockResolvedValue(null);
      mockPrisma.mealPlan.create.mockResolvedValue({
        ...mockMealPlan,
        meals: [],
      });

      const weekStart = new Date("2024-02-01");
      const weekEnd = new Date("2024-02-07");

      const res = await app.request(`/test-household-id/meal-plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Meal plan created successfully");
    });
  });

  describe("POST /:householdId/meal-plans/:planId/meals", () => {
    it("should add a meal to meal plan with ingredient availability check", async () => {
      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan);
      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.mealPlanItem.findFirst.mockResolvedValue(null);
      mockPrisma.mealPlanItem.create.mockResolvedValue({
        id: "meal-item-id",
        date: new Date("2024-01-03"),
        mealType: "DINNER",
        recipeId: mockRecipe.id,
        recipe: {
          id: mockRecipe.id,
          name: mockRecipe.name,
        },
      });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "inventory-1",
        quantity: 10,
      });

      const res = await app.request(
        `/test-household-id/meal-plans/test-meal-plan-id/meals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: new Date("2024-01-03").toISOString(),
            mealType: "DINNER",
            recipeId: mockRecipe.id,
          }),
        }
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Meal added to plan successfully");
      expect(data.data.ingredientAvailability).toBeDefined();
    });
  });

  describe("POST /:householdId/meal-plans/:planId/meals/:mealId/cook", () => {
    it("should mark meal as cooked and deduct ingredients from inventory", async () => {
      const mockMeal = {
        id: "meal-item-id",
        cooked: false,
        recipe: {
          ingredients: [
            {
              id: "ingredient-1",
              quantity: 2,
              unit: "cups",
              inventoryItem: {
                id: "inventory-1",
                name: "Test Ingredient 1",
              },
            },
          ],
        },
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.findFirst.mockResolvedValue(mockMeal);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "inventory-1",
        quantity: 10,
      });

      const cookedMeal = { ...mockMeal, cooked: true, cookedAt: new Date() };
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          inventoryItem: {
            update: vi
              .fn()
              .mockResolvedValue({ id: "inventory-1", quantity: 8 }),
          },
          mealPlanItem: {
            update: vi.fn().mockResolvedValue(cookedMeal),
          },
        });
      });

      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: "inventory-1",
        quantity: 8,
      });

      const res = await app.request(
        `/test-household-id/meal-plans/test-meal-plan-id/meals/meal-item-id/cook`,
        {
          method: "POST",
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe(
        "Meal marked as cooked and ingredients deducted from inventory"
      );
      expect(data.data.inventoryUpdates).toBe(1);
    });
  });

  describe("GET /:householdId/meal-plans/:planId/ingredient-availability", () => {
    it("should return ingredient availability report", async () => {
      const mealPlanWithMeals = {
        ...mockMealPlan,
        meals: [
          {
            id: "meal-1",
            date: new Date("2024-01-03"),
            mealType: "DINNER",
            cooked: false,
            recipe: mockRecipe,
          },
        ],
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mealPlanWithMeals);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "inventory-1",
        quantity: 5,
      });

      const res = await app.request(
        `/test-household-id/meal-plans/test-meal-plan-id/ingredient-availability`,
        {
          method: "GET",
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.ingredientAvailability).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });
  });

  describe("POST /:householdId/meal-plans/:planId/generate-shopping-list", () => {
    it("should generate shopping list from missing ingredients", async () => {
      const mealPlanWithMeals = {
        ...mockMealPlan,
        meals: [
          {
            id: "meal-1",
            date: new Date("2024-01-03"),
            mealType: "DINNER",
            cooked: false,
            recipe: mockRecipe,
          },
        ],
      };

      mockPrisma.mealPlan.findFirst.mockResolvedValue(mealPlanWithMeals);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: "inventory-1",
        quantity: 1, // Less than required (2)
      });
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
      mockPrisma.shoppingListItem.create.mockResolvedValue({
        id: "shopping-item-1",
        name: "Test Ingredient 1",
        quantity: 1,
        unit: "cups",
        category: "Test Category",
        householdId: mockHousehold.id,
      });

      const res = await app.request(
        `/test-household-id/meal-plans/test-meal-plan-id/generate-shopping-list`,
        {
          method: "POST",
        }
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.itemsAdded).toBe(1);
      expect(mockWsManager.broadcastToHousehold).toHaveBeenCalledWith(
        mockHousehold.id,
        "shopping-list:item-added",
        expect.any(Object)
      );
    });
  });
});
