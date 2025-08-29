import { Hono } from "hono";
import {
  authMiddleware,
  householdAccessMiddleware,
} from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import type { ApiResponse, PaginatedResponse } from "../lib/types.js";
import "../lib/hono-types.js";

const inventoryRoutes = new Hono();

// Get all inventory items for a household
inventoryRoutes.get(
  "/:householdId/inventory",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const query = c.req.query();

      // Parse query parameters
      const page = parseInt(query.page || "1");
      const limit = Math.min(parseInt(query.limit || "50"), 100); // Max 100 items per page
      const category = query.category;
      const search = query.search;
      const sortBy = query.sortBy || "name"; // name, category, quantity, createdAt, updatedAt
      const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

      // Build where clause
      const where: any = {
        householdId: household.id,
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.name = {
          contains: search,
          mode: "insensitive",
        };
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (sortBy === "name" || sortBy === "category" || sortBy === "quantity") {
        orderBy[sortBy] = sortOrder;
      } else if (sortBy === "createdAt" || sortBy === "updatedAt") {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.name = "asc"; // Default sort
      }

      // Get total count for pagination
      const total = await prisma.inventoryItem.count({ where });

      // Get inventory items
      const inventoryItems = await prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<(typeof inventoryItems)[0]> = {
        success: true,
        data: inventoryItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch inventory",
        code: "INVENTORY_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get inventory categories for a household
inventoryRoutes.get(
  "/:householdId/inventory/categories",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");

      const categories = await prisma.inventoryItem.findMany({
        where: {
          householdId: household.id,
        },
        select: {
          category: true,
        },
        distinct: ["category"],
        orderBy: {
          category: "asc",
        },
      });

      const response: ApiResponse = {
        success: true,
        data: categories.map((item) => item.category),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch inventory categories",
        code: "INVENTORY_CATEGORIES_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get inventory units for a household
inventoryRoutes.get(
  "/:householdId/inventory/units",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");

      const units = await prisma.inventoryItem.findMany({
        where: {
          householdId: household.id,
        },
        select: {
          unit: true,
        },
        distinct: ["unit"],
        orderBy: {
          unit: "asc",
        },
      });

      const response: ApiResponse = {
        success: true,
        data: units.map((item) => item.unit),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching inventory units:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch inventory units",
        code: "INVENTORY_UNITS_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Create a new inventory item
inventoryRoutes.post(
  "/:householdId/inventory",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const body = await c.req.json();

      // Validate required fields
      if (
        !body.name ||
        typeof body.name !== "string" ||
        body.name.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Item name is required",
          code: "INVALID_ITEM_NAME",
        };
        return c.json(response, 400);
      }

      if (body.name.trim().length > 100) {
        const response: ApiResponse = {
          success: false,
          error: "Item name must be 100 characters or less",
          code: "ITEM_NAME_TOO_LONG",
        };
        return c.json(response, 400);
      }

      if (typeof body.quantity !== "number" || body.quantity < 0) {
        const response: ApiResponse = {
          success: false,
          error: "Quantity must be a non-negative number",
          code: "INVALID_QUANTITY",
        };
        return c.json(response, 400);
      }

      if (
        !body.unit ||
        typeof body.unit !== "string" ||
        body.unit.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Unit is required",
          code: "INVALID_UNIT",
        };
        return c.json(response, 400);
      }

      if (body.unit.trim().length > 50) {
        const response: ApiResponse = {
          success: false,
          error: "Unit must be 50 characters or less",
          code: "UNIT_TOO_LONG",
        };
        return c.json(response, 400);
      }

      if (
        !body.category ||
        typeof body.category !== "string" ||
        body.category.trim().length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Category is required",
          code: "INVALID_CATEGORY",
        };
        return c.json(response, 400);
      }

      if (body.category.trim().length > 50) {
        const response: ApiResponse = {
          success: false,
          error: "Category must be 50 characters or less",
          code: "CATEGORY_TOO_LONG",
        };
        return c.json(response, 400);
      }

      // Validate expiry date if provided
      let expiryDate: Date | null = null;
      if (body.expiryDate) {
        expiryDate = new Date(body.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          const response: ApiResponse = {
            success: false,
            error: "Invalid expiry date format",
            code: "INVALID_EXPIRY_DATE",
          };
          return c.json(response, 400);
        }
      }

      // Check for duplicate item name in the same household
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          householdId: household.id,
          name: {
            equals: body.name.trim(),
            mode: "insensitive",
          },
        },
      });

      if (existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "An item with this name already exists in your inventory",
          code: "DUPLICATE_ITEM_NAME",
        };
        return c.json(response, 400);
      }

      // Create inventory item
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          name: body.name.trim(),
          quantity: body.quantity,
          unit: body.unit.trim(),
          category: body.category.trim(),
          expiryDate,
          householdId: household.id,
        },
      });

      const response: ApiResponse = {
        success: true,
        data: inventoryItem,
        message: "Inventory item created successfully",
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to create inventory item",
        code: "INVENTORY_CREATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

export { inventoryRoutes };

// Search inventory items (must be before /:itemId route)
inventoryRoutes.get(
  "/:householdId/inventory/search",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
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

      // Search in name and category
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          householdId: household.id,
          OR: [
            {
              name: {
                contains: searchTerm.trim(),
                mode: "insensitive",
              },
            },
            {
              category: {
                contains: searchTerm.trim(),
                mode: "insensitive",
              },
            },
          ],
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
        data: inventoryItems,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error searching inventory:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to search inventory",
        code: "INVENTORY_SEARCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get a specific inventory item
inventoryRoutes.get(
  "/:householdId/inventory/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");

      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!inventoryItem) {
        const response: ApiResponse = {
          success: false,
          error: "Inventory item not found",
          code: "INVENTORY_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      const response: ApiResponse = {
        success: true,
        data: inventoryItem,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch inventory item",
        code: "INVENTORY_ITEM_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update an inventory item
inventoryRoutes.put(
  "/:householdId/inventory/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");
      const body = await c.req.json();

      // Check if item exists and belongs to household
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Inventory item not found",
          code: "INVENTORY_ITEM_NOT_FOUND",
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
            error: "Item name is required",
            code: "INVALID_ITEM_NAME",
          };
          return c.json(response, 400);
        }

        if (body.name.trim().length > 100) {
          const response: ApiResponse = {
            success: false,
            error: "Item name must be 100 characters or less",
            code: "ITEM_NAME_TOO_LONG",
          };
          return c.json(response, 400);
        }

        // Check for duplicate name (excluding current item)
        const duplicateItem = await prisma.inventoryItem.findFirst({
          where: {
            householdId: household.id,
            name: {
              equals: body.name.trim(),
              mode: "insensitive",
            },
            id: {
              not: itemId,
            },
          },
        });

        if (duplicateItem) {
          const response: ApiResponse = {
            success: false,
            error: "An item with this name already exists in your inventory",
            code: "DUPLICATE_ITEM_NAME",
          };
          return c.json(response, 400);
        }

        updateData.name = body.name.trim();
      }

      // Validate and update quantity
      if (body.quantity !== undefined) {
        if (typeof body.quantity !== "number" || body.quantity < 0) {
          const response: ApiResponse = {
            success: false,
            error: "Quantity must be a non-negative number",
            code: "INVALID_QUANTITY",
          };
          return c.json(response, 400);
        }
        updateData.quantity = body.quantity;
      }

      // Validate and update unit
      if (body.unit !== undefined) {
        if (
          !body.unit ||
          typeof body.unit !== "string" ||
          body.unit.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Unit is required",
            code: "INVALID_UNIT",
          };
          return c.json(response, 400);
        }

        if (body.unit.trim().length > 50) {
          const response: ApiResponse = {
            success: false,
            error: "Unit must be 50 characters or less",
            code: "UNIT_TOO_LONG",
          };
          return c.json(response, 400);
        }

        updateData.unit = body.unit.trim();
      }

      // Validate and update category
      if (body.category !== undefined) {
        if (
          !body.category ||
          typeof body.category !== "string" ||
          body.category.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Category is required",
            code: "INVALID_CATEGORY",
          };
          return c.json(response, 400);
        }

        if (body.category.trim().length > 50) {
          const response: ApiResponse = {
            success: false,
            error: "Category must be 50 characters or less",
            code: "CATEGORY_TOO_LONG",
          };
          return c.json(response, 400);
        }

        updateData.category = body.category.trim();
      }

      // Validate and update expiry date
      if (body.expiryDate !== undefined) {
        if (body.expiryDate === null) {
          updateData.expiryDate = null;
        } else {
          const expiryDate = new Date(body.expiryDate);
          if (isNaN(expiryDate.getTime())) {
            const response: ApiResponse = {
              success: false,
              error: "Invalid expiry date format",
              code: "INVALID_EXPIRY_DATE",
            };
            return c.json(response, 400);
          }
          updateData.expiryDate = expiryDate;
        }
      }

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No valid fields to update",
          code: "NO_UPDATE_DATA",
        };
        return c.json(response, 400);
      }

      // Update inventory item
      const updatedItem = await prisma.inventoryItem.update({
        where: {
          id: itemId,
        },
        data: updateData,
      });

      const response: ApiResponse = {
        success: true,
        data: updatedItem,
        message: "Inventory item updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update inventory item",
        code: "INVENTORY_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update inventory item quantity (quick update endpoint)
inventoryRoutes.patch(
  "/:householdId/inventory/:itemId/quantity",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");
      const body = await c.req.json();

      // Validate quantity
      if (typeof body.quantity !== "number" || body.quantity < 0) {
        const response: ApiResponse = {
          success: false,
          error: "Quantity must be a non-negative number",
          code: "INVALID_QUANTITY",
        };
        return c.json(response, 400);
      }

      // Check if item exists and belongs to household
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Inventory item not found",
          code: "INVENTORY_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Update quantity
      const updatedItem = await prisma.inventoryItem.update({
        where: {
          id: itemId,
        },
        data: {
          quantity: body.quantity,
        },
      });

      const response: ApiResponse = {
        success: true,
        data: updatedItem,
        message: "Inventory item quantity updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating inventory item quantity:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update inventory item quantity",
        code: "INVENTORY_QUANTITY_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Delete an inventory item
inventoryRoutes.delete(
  "/:householdId/inventory/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");

      // Check if item exists and belongs to household
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Inventory item not found",
          code: "INVENTORY_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Delete inventory item
      await prisma.inventoryItem.delete({
        where: {
          id: itemId,
        },
      });

      const response: ApiResponse = {
        success: true,
        message: "Inventory item deleted successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete inventory item",
        code: "INVENTORY_DELETE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);
