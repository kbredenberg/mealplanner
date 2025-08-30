import { Hono } from "hono";
import { authMiddleware } from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import type { ApiResponse, PaginatedResponse } from "../lib/types.js";
import "../lib/hono-types.js";

const recipeRoutes = new Hono();

// Get all recipes accessible to the user (their own recipes + household recipes)
recipeRoutes.get("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const query = c.req.query();

    // Parse query parameters
    const page = parseInt(query.page || "1");
    const limit = Math.min(parseInt(query.limit || "20"), 100); // Max 100 recipes per page
    const search = query.search;
    const tags = query.tags
      ? query.tags.split(",").map((tag: string) => tag.trim())
      : undefined;
    const sortBy = query.sortBy || "name"; // name, createdAt, updatedAt, prepTime, cookTime
    const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

    // Get user's household IDs to access shared recipes
    const userHouseholds = await prisma.householdMember.findMany({
      where: { userId: user.id },
      select: { householdId: true },
    });
    const householdIds = userHouseholds.map((hm) => hm.householdId);

    // Build where clause
    const where: any = {
      OR: [
        { creatorId: user.id }, // User's own recipes
        // Recipes from household members (shared recipes)
        {
          creator: {
            householdMembers: {
              some: {
                householdId: {
                  in: householdIds,
                },
              },
            },
          },
        },
      ],
    };

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              ingredients: {
                some: {
                  inventoryItem: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }

    if (tags && tags.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          tags: {
            hasSome: tags,
          },
        },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (["name", "prepTime", "cookTime", "servings"].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else if (["createdAt", "updatedAt"].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.name = "asc"; // Default sort
    }

    // Get total count for pagination
    const total = await prisma.recipe.count({ where });

    // Get recipes with ingredients
    const recipes = await prisma.recipe.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            mealPlanItems: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<(typeof recipes)[0]> = {
      success: true,
      data: recipes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch recipes",
      code: "RECIPES_FETCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Search recipes by name, ingredients, and tags
recipeRoutes.get("/search", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const query = c.req.query();

    const searchTerm = query.q;
    if (!searchTerm || searchTerm.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "Search term is required",
        code: "MISSING_SEARCH_TERM",
      };
      return c.json(response, 400);
    }

    const limit = Math.min(parseInt(query.limit || "20"), 50); // Max 50 results

    // Get user's household IDs to access shared recipes
    const userHouseholds = await prisma.householdMember.findMany({
      where: { userId: user.id },
      select: { householdId: true },
    });
    const householdIds = userHouseholds.map((hm) => hm.householdId);

    // Search in name, description, tags, and ingredients
    const recipes = await prisma.recipe.findMany({
      where: {
        AND: [
          {
            OR: [
              { creatorId: user.id }, // User's own recipes
              // Recipes from household members
              {
                creator: {
                  householdMembers: {
                    some: {
                      householdId: {
                        in: householdIds,
                      },
                    },
                  },
                },
              },
            ],
          },
          {
            OR: [
              {
                name: {
                  contains: searchTerm.trim(),
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: searchTerm.trim(),
                  mode: "insensitive",
                },
              },
              {
                tags: {
                  hasSome: [searchTerm.trim()],
                },
              },
              {
                ingredients: {
                  some: {
                    inventoryItem: {
                      name: {
                        contains: searchTerm.trim(),
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          name: "asc",
        },
      ],
      take: limit,
    });

    const response: ApiResponse = {
      success: true,
      data: recipes,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error searching recipes:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to search recipes",
      code: "RECIPES_SEARCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Get a specific recipe
recipeRoutes.get("/:recipeId", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const recipeId = c.req.param("recipeId");

    // Get user's household IDs to check access
    const userHouseholds = await prisma.householdMember.findMany({
      where: { userId: user.id },
      select: { householdId: true },
    });
    const householdIds = userHouseholds.map((hm) => hm.householdId);

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        OR: [
          { creatorId: user.id }, // User's own recipe
          // Recipe from household members
          {
            creator: {
              householdMembers: {
                some: {
                  householdId: {
                    in: householdIds,
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
          orderBy: {
            id: "asc", // Maintain ingredient order
          },
        },
        _count: {
          select: {
            mealPlanItems: true,
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

    const response: ApiResponse = {
      success: true,
      data: recipe,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch recipe",
      code: "RECIPE_FETCH_ERROR",
    };
    return c.json(response, 500);
  }
});

// Create a new recipe
recipeRoutes.post("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate required fields
    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim().length === 0
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Recipe name is required",
        code: "INVALID_RECIPE_NAME",
      };
      return c.json(response, 400);
    }

    if (body.name.trim().length > 200) {
      const response: ApiResponse = {
        success: false,
        error: "Recipe name must be 200 characters or less",
        code: "RECIPE_NAME_TOO_LONG",
      };
      return c.json(response, 400);
    }

    if (
      !body.instructions ||
      typeof body.instructions !== "string" ||
      body.instructions.trim().length === 0
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Recipe instructions are required",
        code: "INVALID_INSTRUCTIONS",
      };
      return c.json(response, 400);
    }

    if (body.instructions.trim().length > 5000) {
      const response: ApiResponse = {
        success: false,
        error: "Instructions must be 5000 characters or less",
        code: "INSTRUCTIONS_TOO_LONG",
      };
      return c.json(response, 400);
    }

    // Validate optional fields
    if (
      body.description &&
      (typeof body.description !== "string" || body.description.length > 1000)
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Description must be 1000 characters or less",
        code: "DESCRIPTION_TOO_LONG",
      };
      return c.json(response, 400);
    }

    if (
      body.prepTime &&
      (typeof body.prepTime !== "number" || body.prepTime < 0)
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Prep time must be a non-negative number",
        code: "INVALID_PREP_TIME",
      };
      return c.json(response, 400);
    }

    if (
      body.cookTime &&
      (typeof body.cookTime !== "number" || body.cookTime < 0)
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Cook time must be a non-negative number",
        code: "INVALID_COOK_TIME",
      };
      return c.json(response, 400);
    }

    if (
      body.servings &&
      (typeof body.servings !== "number" || body.servings < 1)
    ) {
      const response: ApiResponse = {
        success: false,
        error: "Servings must be a positive number",
        code: "INVALID_SERVINGS",
      };
      return c.json(response, 400);
    }

    // Validate tags
    let tags: string[] = [];
    if (body.tags) {
      if (!Array.isArray(body.tags)) {
        const response: ApiResponse = {
          success: false,
          error: "Tags must be an array",
          code: "INVALID_TAGS_FORMAT",
        };
        return c.json(response, 400);
      }

      tags = body.tags
        .filter((tag: any) => typeof tag === "string" && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase())
        .slice(0, 20); // Max 20 tags
    }

    // Validate ingredients
    if (
      !body.ingredients ||
      !Array.isArray(body.ingredients) ||
      body.ingredients.length === 0
    ) {
      const response: ApiResponse = {
        success: false,
        error: "At least one ingredient is required",
        code: "MISSING_INGREDIENTS",
      };
      return c.json(response, 400);
    }

    if (body.ingredients.length > 50) {
      const response: ApiResponse = {
        success: false,
        error: "Maximum 50 ingredients allowed",
        code: "TOO_MANY_INGREDIENTS",
      };
      return c.json(response, 400);
    }

    // Validate each ingredient
    const validatedIngredients: Array<{
      quantity: number;
      unit: string;
      notes: string | null;
      inventoryItemId: string | null;
    }> = [];
    for (let i = 0; i < body.ingredients.length; i++) {
      const ingredient = body.ingredients[i];

      if (typeof ingredient.quantity !== "number" || ingredient.quantity <= 0) {
        const response: ApiResponse = {
          success: false,
          error: `Ingredient ${i + 1}: Quantity must be a positive number`,
          code: "INVALID_INGREDIENT_QUANTITY",
        };
        return c.json(response, 400);
      }

      if (
        !ingredient.unit ||
        typeof ingredient.unit !== "string" ||
        ingredient.unit.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: `Ingredient ${i + 1}: Unit is required`,
          code: "INVALID_INGREDIENT_UNIT",
        };
        return c.json(response, 400);
      }

      if (ingredient.unit.trim().length > 50) {
        const response: ApiResponse = {
          success: false,
          error: `Ingredient ${i + 1}: Unit must be 50 characters or less`,
          code: "INGREDIENT_UNIT_TOO_LONG",
        };
        return c.json(response, 400);
      }

      if (
        ingredient.notes &&
        (typeof ingredient.notes !== "string" || ingredient.notes.length > 200)
      ) {
        const response: ApiResponse = {
          success: false,
          error: `Ingredient ${i + 1}: Notes must be 200 characters or less`,
          code: "INGREDIENT_NOTES_TOO_LONG",
        };
        return c.json(response, 400);
      }

      validatedIngredients.push({
        quantity: ingredient.quantity,
        unit: ingredient.unit.trim(),
        notes: ingredient.notes?.trim() || null,
        inventoryItemId: ingredient.inventoryItemId || null,
      });
    }

    // Create recipe with ingredients in a transaction
    const recipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: {
          name: body.name.trim(),
          description: body.description?.trim() || null,
          instructions: body.instructions.trim(),
          prepTime: body.prepTime || null,
          cookTime: body.cookTime || null,
          servings: body.servings || null,
          tags,
          creatorId: user.id,
        },
      });

      // Create ingredients
      await tx.recipeIngredient.createMany({
        data: validatedIngredients.map((ingredient) => ({
          ...ingredient,
          recipeId: newRecipe.id,
        })),
      });

      return newRecipe;
    });

    // Fetch the complete recipe with ingredients
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: completeRecipe,
      message: "Recipe created successfully",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating recipe:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to create recipe",
      code: "RECIPE_CREATE_ERROR",
    };
    return c.json(response, 500);
  }
});

export { recipeRoutes };
// Update a recipe
recipeRoutes.put("/:recipeId", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const recipeId = c.req.param("recipeId");
    const body = await c.req.json();

    // Check if recipe exists and user has permission to edit
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        creatorId: user.id, // Only recipe creator can edit
      },
    });

    if (!existingRecipe) {
      const response: ApiResponse = {
        success: false,
        error: "Recipe not found or you don't have permission to edit it",
        code: "RECIPE_NOT_FOUND_OR_NO_PERMISSION",
      };
      return c.json(response, 404);
    }

    // Build update data
    const updateData: any = {};

    // Validate and update name
    if (body.name !== undefined) {
      if (
        !body.name ||
        typeof body.name !== "string" ||
        body.name.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Recipe name is required",
          code: "INVALID_RECIPE_NAME",
        };
        return c.json(response, 400);
      }

      if (body.name.trim().length > 200) {
        const response: ApiResponse = {
          success: false,
          error: "Recipe name must be 200 characters or less",
          code: "RECIPE_NAME_TOO_LONG",
        };
        return c.json(response, 400);
      }

      updateData.name = body.name.trim();
    }

    // Validate and update description
    if (body.description !== undefined) {
      if (body.description === null) {
        updateData.description = null;
      } else if (
        typeof body.description !== "string" ||
        body.description.length > 1000
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Description must be 1000 characters or less",
          code: "DESCRIPTION_TOO_LONG",
        };
        return c.json(response, 400);
      } else {
        updateData.description = body.description.trim();
      }
    }

    // Validate and update instructions
    if (body.instructions !== undefined) {
      if (
        !body.instructions ||
        typeof body.instructions !== "string" ||
        body.instructions.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Recipe instructions are required",
          code: "INVALID_INSTRUCTIONS",
        };
        return c.json(response, 400);
      }

      if (body.instructions.trim().length > 5000) {
        const response: ApiResponse = {
          success: false,
          error: "Instructions must be 5000 characters or less",
          code: "INSTRUCTIONS_TOO_LONG",
        };
        return c.json(response, 400);
      }

      updateData.instructions = body.instructions.trim();
    }

    // Validate and update prep time
    if (body.prepTime !== undefined) {
      if (body.prepTime === null) {
        updateData.prepTime = null;
      } else if (typeof body.prepTime !== "number" || body.prepTime < 0) {
        const response: ApiResponse = {
          success: false,
          error: "Prep time must be a non-negative number",
          code: "INVALID_PREP_TIME",
        };
        return c.json(response, 400);
      } else {
        updateData.prepTime = body.prepTime;
      }
    }

    // Validate and update cook time
    if (body.cookTime !== undefined) {
      if (body.cookTime === null) {
        updateData.cookTime = null;
      } else if (typeof body.cookTime !== "number" || body.cookTime < 0) {
        const response: ApiResponse = {
          success: false,
          error: "Cook time must be a non-negative number",
          code: "INVALID_COOK_TIME",
        };
        return c.json(response, 400);
      } else {
        updateData.cookTime = body.cookTime;
      }
    }

    // Validate and update servings
    if (body.servings !== undefined) {
      if (body.servings === null) {
        updateData.servings = null;
      } else if (typeof body.servings !== "number" || body.servings < 1) {
        const response: ApiResponse = {
          success: false,
          error: "Servings must be a positive number",
          code: "INVALID_SERVINGS",
        };
        return c.json(response, 400);
      } else {
        updateData.servings = body.servings;
      }
    }

    // Validate and update tags
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        const response: ApiResponse = {
          success: false,
          error: "Tags must be an array",
          code: "INVALID_TAGS_FORMAT",
        };
        return c.json(response, 400);
      }

      updateData.tags = body.tags
        .filter((tag: any) => typeof tag === "string" && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase())
        .slice(0, 20); // Max 20 tags
    }

    // Handle ingredients update
    let validatedIngredients: Array<{
      quantity: number;
      unit: string;
      notes: string | null;
      inventoryItemId: string | null;
    }> | null = null;
    if (body.ingredients !== undefined) {
      if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "At least one ingredient is required",
          code: "MISSING_INGREDIENTS",
        };
        return c.json(response, 400);
      }

      if (body.ingredients.length > 50) {
        const response: ApiResponse = {
          success: false,
          error: "Maximum 50 ingredients allowed",
          code: "TOO_MANY_INGREDIENTS",
        };
        return c.json(response, 400);
      }

      // Validate each ingredient
      validatedIngredients = [];
      for (let i = 0; i < body.ingredients.length; i++) {
        const ingredient = body.ingredients[i];

        if (
          typeof ingredient.quantity !== "number" ||
          ingredient.quantity <= 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: `Ingredient ${i + 1}: Quantity must be a positive number`,
            code: "INVALID_INGREDIENT_QUANTITY",
          };
          return c.json(response, 400);
        }

        if (
          !ingredient.unit ||
          typeof ingredient.unit !== "string" ||
          ingredient.unit.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: `Ingredient ${i + 1}: Unit is required`,
            code: "INVALID_INGREDIENT_UNIT",
          };
          return c.json(response, 400);
        }

        if (ingredient.unit.trim().length > 50) {
          const response: ApiResponse = {
            success: false,
            error: `Ingredient ${i + 1}: Unit must be 50 characters or less`,
            code: "INGREDIENT_UNIT_TOO_LONG",
          };
          return c.json(response, 400);
        }

        if (
          ingredient.notes &&
          (typeof ingredient.notes !== "string" ||
            ingredient.notes.length > 200)
        ) {
          const response: ApiResponse = {
            success: false,
            error: `Ingredient ${i + 1}: Notes must be 200 characters or less`,
            code: "INGREDIENT_NOTES_TOO_LONG",
          };
          return c.json(response, 400);
        }

        validatedIngredients.push({
          quantity: ingredient.quantity,
          unit: ingredient.unit.trim(),
          notes: ingredient.notes?.trim() || null,
          inventoryItemId: ingredient.inventoryItemId || null,
        });
      }
    }

    // Update recipe in a transaction
    const updatedRecipe = await prisma.$transaction(async (tx) => {
      // Update recipe basic info
      const recipe = await tx.recipe.update({
        where: { id: recipeId },
        data: updateData,
      });

      // Update ingredients if provided
      if (validatedIngredients !== null) {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: recipeId },
        });

        // Create new ingredients
        await tx.recipeIngredient.createMany({
          data: validatedIngredients.map((ingredient) => ({
            ...ingredient,
            recipeId: recipeId,
          })),
        });
      }

      return recipe;
    });

    // Fetch the complete updated recipe
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: updatedRecipe.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: completeRecipe,
      message: "Recipe updated successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error updating recipe:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update recipe",
      code: "RECIPE_UPDATE_ERROR",
    };
    return c.json(response, 500);
  }
});

// Delete a recipe
recipeRoutes.delete("/:recipeId", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const recipeId = c.req.param("recipeId");

    // Check if recipe exists and user has permission to delete
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        creatorId: user.id, // Only recipe creator can delete
      },
      include: {
        _count: {
          select: {
            mealPlanItems: true,
          },
        },
      },
    });

    if (!existingRecipe) {
      const response: ApiResponse = {
        success: false,
        error: "Recipe not found or you don't have permission to delete it",
        code: "RECIPE_NOT_FOUND_OR_NO_PERMISSION",
      };
      return c.json(response, 404);
    }

    // Check if recipe is used in meal plans
    if (existingRecipe._count.mealPlanItems > 0) {
      const response: ApiResponse = {
        success: false,
        error: "Cannot delete recipe that is used in meal plans",
        code: "RECIPE_IN_USE",
      };
      return c.json(response, 400);
    }

    // Delete recipe (ingredients will be deleted automatically due to cascade)
    await prisma.recipe.delete({
      where: { id: recipeId },
    });

    const response: ApiResponse = {
      success: true,
      message: "Recipe deleted successfully",
    };

    return c.json(response);
  } catch (error) {
    console.error("Error deleting recipe:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete recipe",
      code: "RECIPE_DELETE_ERROR",
    };
    return c.json(response, 500);
  }
});

// Validate recipe ingredients against household inventory
recipeRoutes.post(
  "/:recipeId/validate-ingredients",
  authMiddleware,
  async (c) => {
    try {
      const user = c.get("user");
      const recipeId = c.req.param("recipeId");
      const body = await c.req.json();

      // Validate householdId
      if (!body.householdId || typeof body.householdId !== "string") {
        const response: ApiResponse = {
          success: false,
          error: "Household ID is required",
          code: "MISSING_HOUSEHOLD_ID",
        };
        return c.json(response, 400);
      }

      // Check if user has access to the household
      const householdMember = await prisma.householdMember.findFirst({
        where: {
          userId: user.id,
          householdId: body.householdId,
        },
      });

      if (!householdMember) {
        const response: ApiResponse = {
          success: false,
          error: "You don't have access to this household",
          code: "HOUSEHOLD_ACCESS_DENIED",
        };
        return c.json(response, 403);
      }

      // Get user's household IDs to check recipe access
      const userHouseholds = await prisma.householdMember.findMany({
        where: { userId: user.id },
        select: { householdId: true },
      });
      const householdIds = userHouseholds.map((hm) => hm.householdId);

      // Get recipe with ingredients
      const recipe = await prisma.recipe.findFirst({
        where: {
          id: recipeId,
          OR: [
            { creatorId: user.id }, // User's own recipe
            // Recipe from household members
            {
              creator: {
                householdMembers: {
                  some: {
                    householdId: {
                      in: householdIds,
                    },
                  },
                },
              },
            },
          ],
        },
        include: {
          ingredients: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  category: true,
                },
              },
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

      // Get household inventory
      const inventory = await prisma.inventoryItem.findMany({
        where: {
          householdId: body.householdId,
        },
      });

      // Create inventory lookup map
      const inventoryMap = new Map();
      inventory.forEach((item) => {
        inventoryMap.set(item.id, item);
      });

      // Validate each ingredient
      const validationResults = recipe.ingredients.map((ingredient) => {
        const result: any = {
          ingredient: {
            id: ingredient.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            inventoryItem: ingredient.inventoryItem,
          },
          available: false,
          sufficientQuantity: false,
          inventoryQuantity: 0,
          missingQuantity: 0,
        };

        if (ingredient.inventoryItemId) {
          const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
          if (inventoryItem) {
            result.available = true;
            result.inventoryQuantity = inventoryItem.quantity;
            result.sufficientQuantity =
              inventoryItem.quantity >= ingredient.quantity;
            result.missingQuantity = Math.max(
              0,
              ingredient.quantity - inventoryItem.quantity
            );
          }
        }

        return result;
      });

      // Calculate overall availability
      const totalIngredients = validationResults.length;
      const availableIngredients = validationResults.filter(
        (r) => r.available
      ).length;
      const sufficientIngredients = validationResults.filter(
        (r) => r.sufficientQuantity
      ).length;
      const missingIngredients = validationResults.filter(
        (r) => !r.available || !r.sufficientQuantity
      );

      const summary = {
        totalIngredients,
        availableIngredients,
        sufficientIngredients,
        canMakeRecipe: sufficientIngredients === totalIngredients,
        missingIngredientsCount: missingIngredients.length,
      };

      const response: ApiResponse = {
        success: true,
        data: {
          recipe: {
            id: recipe.id,
            name: recipe.name,
            servings: recipe.servings,
          },
          household: {
            id: body.householdId,
          },
          summary,
          ingredients: validationResults,
          missingIngredients,
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error validating recipe ingredients:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to validate recipe ingredients",
        code: "RECIPE_VALIDATION_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get recipe tags (for filtering/autocomplete)
recipeRoutes.get("/tags/list", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    // Get user's household IDs to access shared recipes
    const userHouseholds = await prisma.householdMember.findMany({
      where: { userId: user.id },
      select: { householdId: true },
    });
    const householdIds = userHouseholds.map((hm) => hm.householdId);

    // Get all unique tags from accessible recipes
    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { creatorId: user.id }, // User's own recipes
          // Recipes from household members
          {
            creator: {
              householdMembers: {
                some: {
                  householdId: {
                    in: householdIds,
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        tags: true,
      },
    });

    // Collect all unique tags
    const allTags = new Set<string>();
    recipes.forEach((recipe) => {
      recipe.tags.forEach((tag) => allTags.add(tag));
    });

    const sortedTags = Array.from(allTags).sort();

    const response: ApiResponse = {
      success: true,
      data: sortedTags,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching recipe tags:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch recipe tags",
      code: "RECIPE_TAGS_ERROR",
    };
    return c.json(response, 500);
  }
});
