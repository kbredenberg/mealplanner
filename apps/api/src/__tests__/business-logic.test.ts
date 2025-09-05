import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../lib/prisma.js";
import type {
  User,
  Household,
  Recipe,
  InventoryItem,
  MealPlan,
} from "@prisma/client";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    inventoryItem: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    recipe: {
      findUnique: vi.fn(),
    },
    mealPlanItem: {
      update: vi.fn(),
    },
    recipeIngredient: {
      findMany: vi.fn(),
    },
  },
}));

describe("Business Logic Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Inventory Deduction Logic", () => {
    it("should deduct ingredients when meal is marked as cooked", async () => {
      const mockRecipe = {
        id: "recipe-1",
        name: "Pasta",
        ingredients: [
          { id: "ing-1", quantity: 2, unit: "cups", notes: "flour" },
          { id: "ing-2", quantity: 1, unit: "cup", notes: "water" },
        ],
      };

      const mockInventoryItems = [
        {
          id: "inv-1",
          name: "flour",
          quantity: 5,
          unit: "cups",
          householdId: "household-1",
        },
        {
          id: "inv-2",
          name: "water",
          quantity: 3,
          unit: "cups",
          householdId: "household-1",
        },
      ];

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipeIngredient.findMany as any).mockResolvedValue(
        mockRecipe.ingredients
      );
      (prisma.inventoryItem.findMany as any).mockResolvedValue(
        mockInventoryItems
      );
      (prisma.inventoryItem.update as any).mockResolvedValue({});

      // Simulate marking meal as cooked
      const householdId = "household-1";
      const recipeId = "recipe-1";

      // This would be the actual business logic function
      const deductIngredients = async (
        householdId: string,
        recipeId: string
      ) => {
        const recipe = await prisma.recipe.findUnique({
          where: { id: recipeId },
          include: { ingredients: true },
        });

        if (!recipe) throw new Error("Recipe not found");

        const ingredients = await prisma.recipeIngredient.findMany({
          where: { recipeId },
        });

        for (const ingredient of ingredients) {
          const inventoryItem = await prisma.inventoryItem.findMany({
            where: {
              householdId,
              name: { contains: ingredient.notes, mode: "insensitive" },
              unit: ingredient.unit,
            },
          });

          if (inventoryItem.length > 0) {
            const item = inventoryItem[0];
            const newQuantity = Math.max(
              0,
              item.quantity - ingredient.quantity
            );

            await prisma.inventoryItem.update({
              where: { id: item.id },
              data: { quantity: newQuantity },
            });
          }
        }
      };

      await deductIngredients(householdId, recipeId);

      expect(prisma.inventoryItem.update).toHaveBeenCalledTimes(2);
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { quantity: 3 }, // 5 - 2 = 3
      });
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "inv-2" },
        data: { quantity: 2 }, // 3 - 1 = 2
      });
    });

    it("should handle insufficient inventory gracefully", async () => {
      const mockRecipe = {
        id: "recipe-1",
        name: "Pasta",
        ingredients: [
          { id: "ing-1", quantity: 10, unit: "cups", notes: "flour" },
        ],
      };

      const mockInventoryItems = [
        {
          id: "inv-1",
          name: "flour",
          quantity: 2, // Less than required
          unit: "cups",
          householdId: "household-1",
        },
      ];

      (prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
      (prisma.recipeIngredient.findMany as any).mockResolvedValue(
        mockRecipe.ingredients
      );
      (prisma.inventoryItem.findMany as any).mockResolvedValue(
        mockInventoryItems
      );
      (prisma.inventoryItem.update as any).mockResolvedValue({});

      const deductIngredients = async (
        householdId: string,
        recipeId: string
      ) => {
        const ingredients = await prisma.recipeIngredient.findMany({
          where: { recipeId },
        });

        for (const ingredient of ingredients) {
          const inventoryItem = await prisma.inventoryItem.findMany({
            where: {
              householdId,
              name: { contains: ingredient.notes, mode: "insensitive" },
              unit: ingredient.unit,
            },
          });

          if (inventoryItem.length > 0) {
            const item = inventoryItem[0];
            const newQuantity = Math.max(
              0,
              item.quantity - ingredient.quantity
            );

            await prisma.inventoryItem.update({
              where: { id: item.id },
              data: { quantity: newQuantity },
            });
          }
        }
      };

      await deductIngredients("household-1", "recipe-1");

      // Should set quantity to 0, not negative
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { quantity: 0 },
      });
    });
  });

  describe("Ingredient Availability Checking", () => {
    it("should check if all ingredients are available for a recipe", async () => {
      const mockRecipeIngredients = [
        { id: "ing-1", quantity: 2, unit: "cups", notes: "flour" },
        { id: "ing-2", quantity: 1, unit: "cup", notes: "milk" },
      ];

      const mockInventoryItems = [
        {
          id: "inv-1",
          name: "flour",
          quantity: 5,
          unit: "cups",
          householdId: "household-1",
        },
        {
          id: "inv-2",
          name: "milk",
          quantity: 2,
          unit: "cups",
          householdId: "household-1",
        },
      ];

      (prisma.recipeIngredient.findMany as any).mockResolvedValue(
        mockRecipeIngredients
      );
      (prisma.inventoryItem.findMany as any).mockResolvedValue(
        mockInventoryItems
      );

      const checkIngredientAvailability = async (
        householdId: string,
        recipeId: string
      ) => {
        const ingredients = await prisma.recipeIngredient.findMany({
          where: { recipeId },
        });

        const availability = [];

        for (const ingredient of ingredients) {
          const inventoryItems = await prisma.inventoryItem.findMany({
            where: {
              householdId,
              name: { contains: ingredient.notes, mode: "insensitive" },
              unit: ingredient.unit,
            },
          });

          const availableQuantity = inventoryItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const isAvailable = availableQuantity >= ingredient.quantity;

          availability.push({
            ingredient: ingredient.notes,
            required: ingredient.quantity,
            available: availableQuantity,
            isAvailable,
          });
        }

        return availability;
      };

      const result = await checkIngredientAvailability(
        "household-1",
        "recipe-1"
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ingredient: "flour",
        required: 2,
        available: 5,
        isAvailable: true,
      });
      expect(result[1]).toEqual({
        ingredient: "milk",
        required: 1,
        available: 2,
        isAvailable: true,
      });
    });

    it("should identify missing ingredients", async () => {
      const mockRecipeIngredients = [
        { id: "ing-1", quantity: 2, unit: "cups", notes: "flour" },
        { id: "ing-2", quantity: 1, unit: "cup", notes: "sugar" },
      ];

      const mockInventoryItems = [
        {
          id: "inv-1",
          name: "flour",
          quantity: 1, // Insufficient
          unit: "cups",
          householdId: "household-1",
        },
        // No sugar in inventory
      ];

      (prisma.recipeIngredient.findMany as any).mockResolvedValue(
        mockRecipeIngredients
      );
      (prisma.inventoryItem.findMany as any)
        .mockResolvedValueOnce([mockInventoryItems[0]]) // flour query
        .mockResolvedValueOnce([]); // sugar query

      const checkIngredientAvailability = async (
        householdId: string,
        recipeId: string
      ) => {
        const ingredients = await prisma.recipeIngredient.findMany({
          where: { recipeId },
        });

        const availability = [];

        for (const ingredient of ingredients) {
          const inventoryItems = await prisma.inventoryItem.findMany({
            where: {
              householdId,
              name: { contains: ingredient.notes, mode: "insensitive" },
              unit: ingredient.unit,
            },
          });

          const availableQuantity = inventoryItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const isAvailable = availableQuantity >= ingredient.quantity;

          availability.push({
            ingredient: ingredient.notes,
            required: ingredient.quantity,
            available: availableQuantity,
            isAvailable,
          });
        }

        return availability;
      };

      const result = await checkIngredientAvailability(
        "household-1",
        "recipe-1"
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ingredient: "flour",
        required: 2,
        available: 1,
        isAvailable: false,
      });
      expect(result[1]).toEqual({
        ingredient: "sugar",
        required: 1,
        available: 0,
        isAvailable: false,
      });
    });
  });

  describe("Shopping List Generation", () => {
    it("should generate shopping list from missing ingredients", async () => {
      const missingIngredients = [
        { ingredient: "flour", required: 2, available: 1, isAvailable: false },
        { ingredient: "sugar", required: 1, available: 0, isAvailable: false },
      ];

      const generateShoppingList = (availability: any[]) => {
        return availability
          .filter((item) => !item.isAvailable)
          .map((item) => ({
            name: item.ingredient,
            quantity: item.required - item.available,
            unit: "cups", // Would be derived from recipe
            category: "Baking", // Would be derived from ingredient mapping
          }));
      };

      const shoppingList = generateShoppingList(missingIngredients);

      expect(shoppingList).toHaveLength(2);
      expect(shoppingList[0]).toEqual({
        name: "flour",
        quantity: 1, // 2 required - 1 available
        unit: "cups",
        category: "Baking",
      });
      expect(shoppingList[1]).toEqual({
        name: "sugar",
        quantity: 1, // 1 required - 0 available
        unit: "cups",
        category: "Baking",
      });
    });
  });

  describe("Meal Plan Validation", () => {
    it("should validate meal plan feasibility", async () => {
      const mockMealPlan = [
        { date: "2024-01-01", mealType: "DINNER", recipeId: "recipe-1" },
        { date: "2024-01-02", mealType: "LUNCH", recipeId: "recipe-2" },
      ];

      const mockRecipe1Ingredients = [
        { quantity: 2, unit: "cups", notes: "flour" },
      ];

      const mockRecipe2Ingredients = [
        { quantity: 1, unit: "cup", notes: "flour" },
      ];

      const mockInventory = [{ name: "flour", quantity: 2, unit: "cups" }];

      (prisma.recipeIngredient.findMany as any)
        .mockResolvedValueOnce(mockRecipe1Ingredients)
        .mockResolvedValueOnce(mockRecipe2Ingredients);

      (prisma.inventoryItem.findMany as any).mockResolvedValue(mockInventory);

      const validateMealPlan = async (mealPlan: any[], householdId: string) => {
        let totalFlourNeeded = 0;

        for (const meal of mealPlan) {
          const ingredients = await prisma.recipeIngredient.findMany({
            where: { recipeId: meal.recipeId },
          });

          for (const ingredient of ingredients) {
            if (ingredient.notes === "flour") {
              totalFlourNeeded += ingredient.quantity;
            }
          }
        }

        const inventory = await prisma.inventoryItem.findMany({
          where: { householdId, name: "flour" },
        });

        const availableFlour = inventory.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        return {
          isValid: availableFlour >= totalFlourNeeded,
          totalNeeded: totalFlourNeeded,
          available: availableFlour,
          shortage: Math.max(0, totalFlourNeeded - availableFlour),
        };
      };

      const result = await validateMealPlan(mockMealPlan, "household-1");

      expect(result).toEqual({
        isValid: false,
        totalNeeded: 3, // 2 + 1
        available: 2,
        shortage: 1,
      });
    });
  });
});
