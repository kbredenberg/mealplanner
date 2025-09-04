import { z } from "zod";
import { createValidationError } from "./error-handler.js";
import type { Context } from "hono";

// Common validation schemas
export const idSchema = z.string().cuid("Invalid ID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
  q: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Household validation schemas
export const createHouseholdSchema = z.object({
  name: z
    .string()
    .min(1, "Household name is required")
    .max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

export const updateHouseholdSchema = z.object({
  name: z
    .string()
    .min(1, "Household name is required")
    .max(100, "Name too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// Inventory validation schemas
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100, "Name too long"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required").max(20, "Unit too long"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category too long"),
  expiryDate: z.string().datetime().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Name too long")
    .optional(),
  quantity: z.number().min(0, "Quantity cannot be negative").optional(),
  unit: z
    .string()
    .min(1, "Unit is required")
    .max(20, "Unit too long")
    .optional(),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category too long")
    .optional(),
  expiryDate: z.string().datetime().optional(),
});

// Shopping list validation schemas
export const createShoppingItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100, "Name too long"),
  quantity: z.number().min(0, "Quantity cannot be negative").optional(),
  unit: z.string().max(20, "Unit too long").optional(),
  category: z.string().max(50, "Category too long").optional(),
});

export const updateShoppingItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Name too long")
    .optional(),
  quantity: z.number().min(0, "Quantity cannot be negative").optional(),
  unit: z.string().max(20, "Unit too long").optional(),
  category: z.string().max(50, "Category too long").optional(),
  completed: z.boolean().optional(),
});

// Recipe validation schemas
export const recipeIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  instructions: z.string().min(1, "Instructions are required"),
  prepTime: z.number().int().min(0, "Prep time cannot be negative").optional(),
  cookTime: z.number().int().min(0, "Cook time cannot be negative").optional(),
  servings: z.number().int().min(1, "Servings must be at least 1").optional(),
  tags: z.array(z.string()).default([]),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "At least one ingredient is required"),
});

export const updateRecipeSchema = z.object({
  name: z
    .string()
    .min(1, "Recipe name is required")
    .max(100, "Name too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  instructions: z.string().min(1, "Instructions are required").optional(),
  prepTime: z.number().int().min(0, "Prep time cannot be negative").optional(),
  cookTime: z.number().int().min(0, "Cook time cannot be negative").optional(),
  servings: z.number().int().min(1, "Servings must be at least 1").optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(recipeIngredientSchema).optional(),
});

// Meal plan validation schemas
export const createMealPlanSchema = z.object({
  weekStart: z.string().datetime("Invalid date format"),
});

export const mealPlanItemSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  recipeId: z.string().cuid("Invalid recipe ID").optional(),
  notes: z.string().max(200, "Notes too long").optional(),
});

export const createMealPlanItemSchema = mealPlanItemSchema;

export const updateMealPlanItemSchema = z.object({
  date: z.string().datetime("Invalid date format").optional(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).optional(),
  recipeId: z.string().cuid("Invalid recipe ID").optional(),
  notes: z.string().max(200, "Notes too long").optional(),
  cooked: z.boolean().optional(),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: any) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      c.set("validatedData", validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createValidationError(
          "Request validation failed",
          error.errors.reduce(
            (acc, err) => {
              const path = err.path.join(".");
              if (!acc[path]) acc[path] = [];
              acc[path].push(err.message);
              return acc;
            },
            {} as Record<string, string[]>
          )
        );
      }
      throw error;
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: any) => {
    try {
      const query = c.req.query();
      const validatedQuery = schema.parse(query);
      c.set("validatedQuery", validatedQuery);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createValidationError(
          "Query validation failed",
          error.errors.reduce(
            (acc, err) => {
              const path = err.path.join(".");
              if (!acc[path]) acc[path] = [];
              acc[path].push(err.message);
              return acc;
            },
            {} as Record<string, string[]>
          )
        );
      }
      throw error;
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: any) => {
    try {
      const params = c.req.param();
      const validatedParams = schema.parse(params);
      c.set("validatedParams", validatedParams);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createValidationError(
          "Parameter validation failed",
          error.errors.reduce(
            (acc, err) => {
              const path = err.path.join(".");
              if (!acc[path]) acc[path] = [];
              acc[path].push(err.message);
              return acc;
            },
            {} as Record<string, string[]>
          )
        );
      }
      throw error;
    }
  };
}
