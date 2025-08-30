import { Hono } from "hono";
import {
  authMiddleware,
  householdAccessMiddleware,
} from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import { wsManager } from "../lib/websocket.js";
import type { ApiResponse, PaginatedResponse } from "../lib/types.js";
import "../lib/hono-types.js";

const mealPlanRoutes = new Hono();

// Get all meal plans for a household
mealPlanRoutes.get(
  "/:householdId/meal-plans",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const query = c.req.query();

      // Parse query parameters
      const page = parseInt(query.page || "1");
      const limit = Math.min(parseInt(query.limit || "10"), 50); // Max 50 meal plans per page
      const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

      // Get total count for pagination
      const total = await prisma.mealPlan.count({
        where: { householdId: household.id },
      });

      // Get meal plans with their meals
      const mealPlans = await prisma.mealPlan.findMany({
        where: { householdId: household.id },
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  prepTime: true,
                  cookTime: true,
                  servings: true,
                  tags: true,
                },
              },
            },
            orderBy: [{ date: "asc" }, { mealType: "asc" }],
          },
        },
        orderBy: { weekStart: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<(typeof mealPlans)[0]> = {
        success: true,
        data: mealPlans,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch meal plans",
        code: "MEAL_PLANS_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get current week's meal plan
mealPlanRoutes.get(
  "/:householdId/meal-plans/current",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const now = new Date();

      // Calculate start of current week (Monday)
      const currentWeekStart = new Date(now);
      const dayOfWeek = currentWeekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
      currentWeekStart.setHours(0, 0, 0, 0);

      // Calculate end of current week (Sunday)
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);

      // Find existing meal plan for current week
      let mealPlan = await prisma.mealPlan.findFirst({
        where: {
          householdId: household.id,
          weekStart: {
            gte: currentWeekStart,
            lte: currentWeekEnd,
          },
        },
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  prepTime: true,
                  cookTime: true,
                  servings: true,
                  tags: true,
                },
              },
            },
            orderBy: [{ date: "asc" }, { mealType: "asc" }],
          },
        },
      });

      // If no meal plan exists for current week, create one
      if (!mealPlan) {
        mealPlan = await prisma.mealPlan.create({
          data: {
            householdId: household.id,
            weekStart: currentWeekStart,
            weekEnd: currentWeekEnd,
          },
          include: {
            meals: {
              include: {
                recipe: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    prepTime: true,
                    cookTime: true,
                    servings: true,
                    tags: true,
                  },
                },
              },
              orderBy: [{ date: "asc" }, { mealType: "asc" }],
            },
          },
        });
      }

      const response: ApiResponse = {
        success: true,
        data: mealPlan,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching current meal plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch current meal plan",
        code: "CURRENT_MEAL_PLAN_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Create a new meal plan
mealPlanRoutes.post(
  "/:householdId/meal-plans",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const body = await c.req.json();

      // Validate required fields
      if (!body.weekStart || !body.weekEnd) {
        const response: ApiResponse = {
          success: false,
          error: "Week start and end dates are required",
          code: "INVALID_WEEK_DATES",
        };
        return c.json(response, 400);
      }

      const weekStart = new Date(body.weekStart);
      const weekEnd = new Date(body.weekEnd);

      if (isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid date format",
          code: "INVALID_DATE_FORMAT",
        };
        return c.json(response, 400);
      }

      if (weekEnd <= weekStart) {
        const response: ApiResponse = {
          success: false,
          error: "Week end must be after week start",
          code: "INVALID_WEEK_RANGE",
        };
        return c.json(response, 400);
      }

      // Check for overlapping meal plans
      const existingPlan = await prisma.mealPlan.findFirst({
        where: {
          householdId: household.id,
          OR: [
            {
              weekStart: {
                lte: weekEnd,
              },
              weekEnd: {
                gte: weekStart,
              },
            },
          ],
        },
      });

      if (existingPlan) {
        const response: ApiResponse = {
          success: false,
          error: "A meal plan already exists for this time period",
          code: "OVERLAPPING_MEAL_PLAN",
        };
        return c.json(response, 400);
      }

      // Create meal plan
      const mealPlan = await prisma.mealPlan.create({
        data: {
          householdId: household.id,
          weekStart,
          weekEnd,
        },
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  prepTime: true,
                  cookTime: true,
                  servings: true,
                  tags: true,
                },
              },
            },
            orderBy: [{ date: "asc" }, { mealType: "asc" }],
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: mealPlan,
        message: "Meal plan created successfully",
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to create meal plan",
        code: "MEAL_PLAN_CREATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

export { mealPlanRoutes };
// Get a specific meal plan
mealPlanRoutes.get(
  "/:householdId/meal-plans/:planId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");

      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  prepTime: true,
                  cookTime: true,
                  servings: true,
                  tags: true,
                  ingredients: {
                    select: {
                      id: true,
                      quantity: true,
                      unit: true,
                      notes: true,
                      inventoryItem: {
                        select: {
                          id: true,
                          name: true,
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: [{ date: "asc" }, { mealType: "asc" }],
          },
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      const response: ApiResponse = {
        success: true,
        data: mealPlan,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching meal plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch meal plan",
        code: "MEAL_PLAN_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update a meal plan
mealPlanRoutes.put(
  "/:householdId/meal-plans/:planId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");
      const body = await c.req.json();

      // Check if meal plan exists and belongs to household
      const existingPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!existingPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Build update data
      const updateData: any = {};

      // Validate and update week dates
      if (body.weekStart !== undefined || body.weekEnd !== undefined) {
        const weekStart = body.weekStart
          ? new Date(body.weekStart)
          : existingPlan.weekStart;
        const weekEnd = body.weekEnd
          ? new Date(body.weekEnd)
          : existingPlan.weekEnd;

        if (isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
          const response: ApiResponse = {
            success: false,
            error: "Invalid date format",
            code: "INVALID_DATE_FORMAT",
          };
          return c.json(response, 400);
        }

        if (weekEnd <= weekStart) {
          const response: ApiResponse = {
            success: false,
            error: "Week end must be after week start",
            code: "INVALID_WEEK_RANGE",
          };
          return c.json(response, 400);
        }

        // Check for overlapping meal plans (excluding current plan)
        const overlappingPlan = await prisma.mealPlan.findFirst({
          where: {
            householdId: household.id,
            id: { not: planId },
            OR: [
              {
                weekStart: {
                  lte: weekEnd,
                },
                weekEnd: {
                  gte: weekStart,
                },
              },
            ],
          },
        });

        if (overlappingPlan) {
          const response: ApiResponse = {
            success: false,
            error: "A meal plan already exists for this time period",
            code: "OVERLAPPING_MEAL_PLAN",
          };
          return c.json(response, 400);
        }

        updateData.weekStart = weekStart;
        updateData.weekEnd = weekEnd;
      }

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No valid fields to update",
          code: "NO_UPDATE_DATA",
        };
        return c.json(response, 400);
      }

      // Update meal plan
      const updatedPlan = await prisma.mealPlan.update({
        where: { id: planId },
        data: updateData,
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  prepTime: true,
                  cookTime: true,
                  servings: true,
                  tags: true,
                },
              },
            },
            orderBy: [{ date: "asc" }, { mealType: "asc" }],
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        data: updatedPlan,
        message: "Meal plan updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update meal plan",
        code: "MEAL_PLAN_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Delete a meal plan
mealPlanRoutes.delete(
  "/:householdId/meal-plans/:planId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");

      // Check if meal plan exists and belongs to household
      const existingPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!existingPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Delete meal plan (cascade will delete meal plan items)
      await prisma.mealPlan.delete({
        where: { id: planId },
      });

      const response: ApiResponse = {
        success: true,
        message: "Meal plan deleted successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete meal plan",
        code: "MEAL_PLAN_DELETE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Add a meal to a meal plan
mealPlanRoutes.post(
  "/:householdId/meal-plans/:planId/meals",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");
      const body = await c.req.json();

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Validate required fields
      if (!body.date || !body.mealType) {
        const response: ApiResponse = {
          success: false,
          error: "Date and meal type are required",
          code: "INVALID_MEAL_DATA",
        };
        return c.json(response, 400);
      }

      const mealDate = new Date(body.date);
      if (isNaN(mealDate.getTime())) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid date format",
          code: "INVALID_DATE_FORMAT",
        };
        return c.json(response, 400);
      }

      // Validate meal type
      const validMealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
      if (!validMealTypes.includes(body.mealType)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid meal type",
          code: "INVALID_MEAL_TYPE",
        };
        return c.json(response, 400);
      }

      // Check if meal date is within meal plan range
      if (mealDate < mealPlan.weekStart || mealDate > mealPlan.weekEnd) {
        const response: ApiResponse = {
          success: false,
          error: "Meal date must be within the meal plan week",
          code: "MEAL_DATE_OUT_OF_RANGE",
        };
        return c.json(response, 400);
      }

      // Validate recipe if provided
      let recipe = null;
      if (body.recipeId) {
        recipe = await prisma.recipe.findUnique({
          where: { id: body.recipeId },
          include: {
            ingredients: {
              include: {
                inventoryItem: true,
              },
            },
          },
        });

        if (!recipe) {
          const response: ApiResponse = {
            success: false,
            error: "Recipe not found",
            code: "RECIPE_NOT_FOUND",
          };
          return c.json(response, 404);
        }
      }

      // Check for existing meal at same date and meal type
      const existingMeal = await prisma.mealPlanItem.findFirst({
        where: {
          mealPlanId: planId,
          date: mealDate,
          mealType: body.mealType,
        },
      });

      if (existingMeal) {
        const response: ApiResponse = {
          success: false,
          error: "A meal already exists for this date and meal type",
          code: "DUPLICATE_MEAL_SLOT",
        };
        return c.json(response, 400);
      }

      // Check ingredient availability if recipe is provided
      let ingredientAvailability = null;
      if (recipe) {
        ingredientAvailability = await checkIngredientAvailability(
          household.id,
          recipe.ingredients
        );
      }

      // Create meal plan item
      const mealPlanItem = await prisma.mealPlanItem.create({
        data: {
          mealPlanId: planId,
          date: mealDate,
          mealType: body.mealType,
          recipeId: body.recipeId || null,
          notes: body.notes || null,
        },
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              description: true,
              prepTime: true,
              cookTime: true,
              servings: true,
              tags: true,
            },
          },
        },
      });

      // Broadcast meal plan update
      wsManager.broadcastToHousehold(household.id, "meal-plan:updated", {
        householdId: household.id,
        mealPlanId: planId,
        meal: mealPlanItem,
        action: "added",
      });

      const response: ApiResponse = {
        success: true,
        data: {
          meal: mealPlanItem,
          ingredientAvailability,
        },
        message: "Meal added to plan successfully",
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error adding meal to plan:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to add meal to plan",
        code: "MEAL_ADD_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Helper function to check ingredient availability
async function checkIngredientAvailability(
  householdId: string,
  recipeIngredients: any[]
) {
  const availability = [];

  for (const ingredient of recipeIngredients) {
    if (ingredient.inventoryItem) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          id: ingredient.inventoryItem.id,
          householdId: householdId,
        },
      });

      const available =
        inventoryItem && inventoryItem.quantity >= ingredient.quantity;
      availability.push({
        ingredientId: ingredient.id,
        name: ingredient.inventoryItem.name,
        required: ingredient.quantity,
        available: inventoryItem?.quantity || 0,
        unit: ingredient.unit,
        sufficient: available,
      });
    } else {
      // Ingredient not linked to inventory item
      availability.push({
        ingredientId: ingredient.id,
        name: `Unknown ingredient (${ingredient.unit})`,
        required: ingredient.quantity,
        available: 0,
        unit: ingredient.unit,
        sufficient: false,
        unlinked: true,
      });
    }
  }

  return availability;
}
// Update a meal in a meal plan
mealPlanRoutes.put(
  "/:householdId/meal-plans/:planId/meals/:mealId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");
      const mealId = c.req.param("mealId");
      const body = await c.req.json();

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Check if meal exists and belongs to meal plan
      const existingMeal = await prisma.mealPlanItem.findFirst({
        where: {
          id: mealId,
          mealPlanId: planId,
        },
      });

      if (!existingMeal) {
        const response: ApiResponse = {
          success: false,
          error: "Meal not found",
          code: "MEAL_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Build update data
      const updateData: any = {};

      // Validate and update date
      if (body.date !== undefined) {
        const mealDate = new Date(body.date);
        if (isNaN(mealDate.getTime())) {
          const response: ApiResponse = {
            success: false,
            error: "Invalid date format",
            code: "INVALID_DATE_FORMAT",
          };
          return c.json(response, 400);
        }

        // Check if meal date is within meal plan range
        if (mealDate < mealPlan.weekStart || mealDate > mealPlan.weekEnd) {
          const response: ApiResponse = {
            success: false,
            error: "Meal date must be within the meal plan week",
            code: "MEAL_DATE_OUT_OF_RANGE",
          };
          return c.json(response, 400);
        }

        updateData.date = mealDate;
      }

      // Validate and update meal type
      if (body.mealType !== undefined) {
        const validMealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
        if (!validMealTypes.includes(body.mealType)) {
          const response: ApiResponse = {
            success: false,
            error: "Invalid meal type",
            code: "INVALID_MEAL_TYPE",
          };
          return c.json(response, 400);
        }
        updateData.mealType = body.mealType;
      }

      // Check for duplicate meal slot (excluding current meal)
      if (updateData.date || updateData.mealType) {
        const checkDate = updateData.date || existingMeal.date;
        const checkMealType = updateData.mealType || existingMeal.mealType;

        const duplicateMeal = await prisma.mealPlanItem.findFirst({
          where: {
            mealPlanId: planId,
            date: checkDate,
            mealType: checkMealType,
            id: { not: mealId },
          },
        });

        if (duplicateMeal) {
          const response: ApiResponse = {
            success: false,
            error: "A meal already exists for this date and meal type",
            code: "DUPLICATE_MEAL_SLOT",
          };
          return c.json(response, 400);
        }
      }

      // Validate and update recipe
      if (body.recipeId !== undefined) {
        if (body.recipeId === null) {
          updateData.recipeId = null;
        } else {
          const recipe = await prisma.recipe.findUnique({
            where: { id: body.recipeId },
          });

          if (!recipe) {
            const response: ApiResponse = {
              success: false,
              error: "Recipe not found",
              code: "RECIPE_NOT_FOUND",
            };
            return c.json(response, 404);
          }

          updateData.recipeId = body.recipeId;
        }
      }

      // Update notes
      if (body.notes !== undefined) {
        updateData.notes = body.notes;
      }

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No valid fields to update",
          code: "NO_UPDATE_DATA",
        };
        return c.json(response, 400);
      }

      // Update meal plan item
      const updatedMeal = await prisma.mealPlanItem.update({
        where: { id: mealId },
        data: updateData,
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              description: true,
              prepTime: true,
              cookTime: true,
              servings: true,
              tags: true,
              ingredients: {
                include: {
                  inventoryItem: true,
                },
              },
            },
          },
        },
      });

      // Check ingredient availability if recipe is assigned
      let ingredientAvailability = null;
      if (updatedMeal.recipe) {
        ingredientAvailability = await checkIngredientAvailability(
          household.id,
          updatedMeal.recipe.ingredients
        );
      }

      // Broadcast meal plan update
      wsManager.broadcastToHousehold(household.id, "meal-plan:updated", {
        householdId: household.id,
        mealPlanId: planId,
        meal: updatedMeal,
        action: "updated",
      });

      const response: ApiResponse = {
        success: true,
        data: {
          meal: updatedMeal,
          ingredientAvailability,
        },
        message: "Meal updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating meal:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update meal",
        code: "MEAL_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Delete a meal from a meal plan
mealPlanRoutes.delete(
  "/:householdId/meal-plans/:planId/meals/:mealId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");
      const mealId = c.req.param("mealId");

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Check if meal exists and belongs to meal plan
      const existingMeal = await prisma.mealPlanItem.findFirst({
        where: {
          id: mealId,
          mealPlanId: planId,
        },
      });

      if (!existingMeal) {
        const response: ApiResponse = {
          success: false,
          error: "Meal not found",
          code: "MEAL_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Delete meal plan item
      await prisma.mealPlanItem.delete({
        where: { id: mealId },
      });

      // Broadcast meal plan update
      wsManager.broadcastToHousehold(household.id, "meal-plan:updated", {
        householdId: household.id,
        mealPlanId: planId,
        mealId: mealId,
        action: "deleted",
      });

      const response: ApiResponse = {
        success: true,
        message: "Meal removed from plan successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting meal:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete meal",
        code: "MEAL_DELETE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Mark a meal as cooked and deduct ingredients from inventory
mealPlanRoutes.post(
  "/:householdId/meal-plans/:planId/meals/:mealId/cook",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");
      const mealId = c.req.param("mealId");

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Get meal with recipe and ingredients
      const meal = await prisma.mealPlanItem.findFirst({
        where: {
          id: mealId,
          mealPlanId: planId,
        },
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  inventoryItem: true,
                },
              },
            },
          },
        },
      });

      if (!meal) {
        const response: ApiResponse = {
          success: false,
          error: "Meal not found",
          code: "MEAL_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      if (meal.cooked) {
        const response: ApiResponse = {
          success: false,
          error: "Meal is already marked as cooked",
          code: "MEAL_ALREADY_COOKED",
        };
        return c.json(response, 400);
      }

      if (!meal.recipe) {
        const response: ApiResponse = {
          success: false,
          error: "Cannot cook meal without a recipe",
          code: "NO_RECIPE_ASSIGNED",
        };
        return c.json(response, 400);
      }

      // Check ingredient availability and prepare inventory updates
      const inventoryUpdates: { id: string; newQuantity: number }[] = [];
      const insufficientIngredients: {
        name: string;
        required: number;
        available: number;
        unit: string;
      }[] = [];

      for (const ingredient of meal.recipe.ingredients) {
        if (ingredient.inventoryItem) {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              id: ingredient.inventoryItem.id,
              householdId: household.id,
            },
          });

          if (!inventoryItem) {
            insufficientIngredients.push({
              name: ingredient.inventoryItem.name,
              required: ingredient.quantity,
              available: 0,
              unit: ingredient.unit,
            });
          } else if (inventoryItem.quantity < ingredient.quantity) {
            insufficientIngredients.push({
              name: inventoryItem.name,
              required: ingredient.quantity,
              available: inventoryItem.quantity,
              unit: ingredient.unit,
            });
          } else {
            inventoryUpdates.push({
              id: inventoryItem.id,
              newQuantity: inventoryItem.quantity - ingredient.quantity,
            });
          }
        }
      }

      if (insufficientIngredients.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: "Insufficient ingredients to cook this meal",
          code: "INSUFFICIENT_INGREDIENTS",
          details: { insufficientIngredients },
        };
        return c.json(response, 400);
      }

      // Perform inventory updates and mark meal as cooked in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update inventory quantities
        for (const update of inventoryUpdates) {
          await tx.inventoryItem.update({
            where: { id: update.id },
            data: { quantity: update.newQuantity },
          });
        }

        // Mark meal as cooked
        const cookedMeal = await tx.mealPlanItem.update({
          where: { id: mealId },
          data: {
            cooked: true,
            cookedAt: new Date(),
          },
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                description: true,
                prepTime: true,
                cookTime: true,
                servings: true,
                tags: true,
              },
            },
          },
        });

        return { cookedMeal, inventoryUpdates };
      });

      // Broadcast meal plan update
      wsManager.broadcastToHousehold(household.id, "meal-plan:updated", {
        householdId: household.id,
        mealPlanId: planId,
        meal: result.cookedMeal,
        action: "cooked",
      });

      // Broadcast inventory updates
      for (const update of result.inventoryUpdates) {
        const updatedItem = await prisma.inventoryItem.findUnique({
          where: { id: update.id },
        });
        if (updatedItem) {
          wsManager.broadcastToHousehold(household.id, "inventory:updated", {
            householdId: household.id,
            item: updatedItem,
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          meal: result.cookedMeal,
          inventoryUpdates: result.inventoryUpdates.length,
        },
        message:
          "Meal marked as cooked and ingredients deducted from inventory",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error cooking meal:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to cook meal",
        code: "MEAL_COOK_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get ingredient availability for a meal plan
mealPlanRoutes.get(
  "/:householdId/meal-plans/:planId/ingredient-availability",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
        include: {
          meals: {
            where: {
              cooked: false, // Only check uncooked meals
              recipeId: { not: null }, // Only meals with recipes
            },
            include: {
              recipe: {
                include: {
                  ingredients: {
                    include: {
                      inventoryItem: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Aggregate ingredient requirements across all uncooked meals
      const ingredientRequirements = new Map();

      for (const meal of mealPlan.meals) {
        if (meal.recipe) {
          for (const ingredient of meal.recipe.ingredients) {
            if (ingredient.inventoryItem) {
              const key = ingredient.inventoryItem.id;
              const existing = ingredientRequirements.get(key) || {
                inventoryItemId: ingredient.inventoryItem.id,
                name: ingredient.inventoryItem.name,
                category: ingredient.inventoryItem.category,
                unit: ingredient.unit,
                totalRequired: 0,
                meals: [],
              };

              existing.totalRequired += ingredient.quantity;
              existing.meals.push({
                mealId: meal.id,
                date: meal.date,
                mealType: meal.mealType,
                recipeName: meal.recipe.name,
                quantity: ingredient.quantity,
              });

              ingredientRequirements.set(key, existing);
            }
          }
        }
      }

      // Check availability against current inventory
      const availabilityReport = [];

      for (const [, requirement] of ingredientRequirements) {
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            id: requirement.inventoryItemId,
            householdId: household.id,
          },
        });

        const available = inventoryItem?.quantity || 0;
        const sufficient = available >= requirement.totalRequired;

        availabilityReport.push({
          ...requirement,
          available,
          sufficient,
          shortage: sufficient ? 0 : requirement.totalRequired - available,
        });
      }

      const response: ApiResponse = {
        success: true,
        data: {
          mealPlanId: planId,
          weekStart: mealPlan.weekStart,
          weekEnd: mealPlan.weekEnd,
          ingredientAvailability: availabilityReport,
          summary: {
            totalIngredients: availabilityReport.length,
            sufficientIngredients: availabilityReport.filter(
              (item) => item.sufficient
            ).length,
            insufficientIngredients: availabilityReport.filter(
              (item) => !item.sufficient
            ).length,
          },
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error checking ingredient availability:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to check ingredient availability",
        code: "INGREDIENT_AVAILABILITY_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Generate shopping list from missing ingredients in meal plan
mealPlanRoutes.post(
  "/:householdId/meal-plans/:planId/generate-shopping-list",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const planId = c.req.param("planId");

      // Check if meal plan exists and belongs to household
      const mealPlan = await prisma.mealPlan.findFirst({
        where: {
          id: planId,
          householdId: household.id,
        },
        include: {
          meals: {
            where: {
              cooked: false,
              recipeId: { not: null },
            },
            include: {
              recipe: {
                include: {
                  ingredients: {
                    include: {
                      inventoryItem: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!mealPlan) {
        const response: ApiResponse = {
          success: false,
          error: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Aggregate ingredient requirements
      const ingredientRequirements = new Map();

      for (const meal of mealPlan.meals) {
        if (meal.recipe) {
          for (const ingredient of meal.recipe.ingredients) {
            if (ingredient.inventoryItem) {
              const key = ingredient.inventoryItem.id;
              const existing = ingredientRequirements.get(key) || {
                inventoryItemId: ingredient.inventoryItem.id,
                name: ingredient.inventoryItem.name,
                category: ingredient.inventoryItem.category,
                unit: ingredient.unit,
                totalRequired: 0,
              };

              existing.totalRequired += ingredient.quantity;
              ingredientRequirements.set(key, existing);
            }
          }
        }
      }

      // Check what needs to be added to shopping list
      const itemsToAdd = [];

      for (const [, requirement] of ingredientRequirements) {
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            id: requirement.inventoryItemId,
            householdId: household.id,
          },
        });

        const available = inventoryItem?.quantity || 0;
        const shortage = requirement.totalRequired - available;

        if (shortage > 0) {
          // Check if item already exists in shopping list
          const existingShoppingItem = await prisma.shoppingListItem.findFirst({
            where: {
              householdId: household.id,
              name: requirement.name,
              completed: false,
            },
          });

          if (!existingShoppingItem) {
            itemsToAdd.push({
              name: requirement.name,
              quantity: shortage,
              unit: requirement.unit,
              category: requirement.category,
              householdId: household.id,
            });
          }
        }
      }

      // Add items to shopping list
      const addedItems = [];
      for (const item of itemsToAdd) {
        const shoppingItem = await prisma.shoppingListItem.create({
          data: item,
        });
        addedItems.push(shoppingItem);

        // Broadcast shopping list update
        wsManager.broadcastToHousehold(
          household.id,
          "shopping-list:item-added",
          {
            householdId: household.id,
            item: shoppingItem,
          }
        );
      }

      const response: ApiResponse = {
        success: true,
        data: {
          itemsAdded: addedItems.length,
          items: addedItems,
        },
        message: `Added ${addedItems.length} items to shopping list`,
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error generating shopping list:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to generate shopping list",
        code: "SHOPPING_LIST_GENERATION_ERROR",
      };
      return c.json(response, 500);
    }
  }
);
