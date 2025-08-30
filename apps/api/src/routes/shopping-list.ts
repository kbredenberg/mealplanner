import { Hono } from "hono";
import {
  authMiddleware,
  householdAccessMiddleware,
} from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";
import type { ApiResponse, PaginatedResponse } from "../lib/types.js";
import { wsManager } from "../lib/websocket.js";
import "../lib/hono-types.js";

const shoppingListRoutes = new Hono();

// Get all shopping list items for a household
shoppingListRoutes.get(
  "/:householdId/shopping-list",
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
      const completed = query.completed;
      const sortBy = query.sortBy || "createdAt"; // name, category, completed, createdAt, updatedAt
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

      if (completed !== undefined) {
        where.completed = completed === "true";
      }

      // Build orderBy clause
      const orderBy: any = {};
      if (
        ["name", "category", "completed", "createdAt", "updatedAt"].includes(
          sortBy
        )
      ) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.createdAt = "desc"; // Default sort
      }

      // Get total count for pagination
      const total = await prisma.shoppingListItem.count({ where });

      // Get shopping list items
      const shoppingListItems = await prisma.shoppingListItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<(typeof shoppingListItems)[0]> = {
        success: true,
        data: shoppingListItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch shopping list",
        code: "SHOPPING_LIST_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get shopping list categories for a household
shoppingListRoutes.get(
  "/:householdId/shopping-list/categories",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");

      const categories = await prisma.shoppingListItem.findMany({
        where: {
          householdId: household.id,
          category: {
            not: null,
          },
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
        data: categories.map((item) => item.category).filter(Boolean),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching shopping list categories:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch shopping list categories",
        code: "SHOPPING_LIST_CATEGORIES_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Create a new shopping list item
shoppingListRoutes.post(
  "/:householdId/shopping-list",
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

      // Validate optional fields
      if (body.quantity !== undefined && body.quantity !== null) {
        if (typeof body.quantity !== "number" || body.quantity <= 0) {
          const response: ApiResponse = {
            success: false,
            error: "Quantity must be a positive number",
            code: "INVALID_QUANTITY",
          };
          return c.json(response, 400);
        }
      }

      if (body.unit !== undefined && body.unit !== null) {
        if (typeof body.unit !== "string" || body.unit.trim().length === 0) {
          const response: ApiResponse = {
            success: false,
            error: "Unit must be a non-empty string",
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
      }

      if (body.category !== undefined && body.category !== null) {
        if (
          typeof body.category !== "string" ||
          body.category.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Category must be a non-empty string",
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
      }

      // Create shopping list item
      const shoppingListItem = await prisma.shoppingListItem.create({
        data: {
          name: body.name.trim(),
          quantity: body.quantity || null,
          unit: body.unit?.trim() || null,
          category: body.category?.trim() || null,
          completed: false,
          householdId: household.id,
        },
      });

      // Broadcast real-time update
      wsManager.broadcastToHousehold(household.id, "shopping-list:item-added", {
        householdId: household.id,
        item: shoppingListItem,
      });

      const response: ApiResponse = {
        success: true,
        data: shoppingListItem,
        message: "Shopping list item created successfully",
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating shopping list item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to create shopping list item",
        code: "SHOPPING_LIST_CREATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

export { shoppingListRoutes };

// Search shopping list items
shoppingListRoutes.get(
  "/:householdId/shopping-list/search",
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
      const shoppingListItems = await prisma.shoppingListItem.findMany({
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
          { completed: "asc" }, // Incomplete items first
          { name: "asc" },
        ],
        take: limit,
      });

      const response: ApiResponse = {
        success: true,
        data: shoppingListItems,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error searching shopping list:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to search shopping list",
        code: "SHOPPING_LIST_SEARCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Get a specific shopping list item
shoppingListRoutes.get(
  "/:householdId/shopping-list/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");

      const shoppingListItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!shoppingListItem) {
        const response: ApiResponse = {
          success: false,
          error: "Shopping list item not found",
          code: "SHOPPING_LIST_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      const response: ApiResponse = {
        success: true,
        data: shoppingListItem,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error fetching shopping list item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to fetch shopping list item",
        code: "SHOPPING_LIST_ITEM_FETCH_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Update a shopping list item
shoppingListRoutes.put(
  "/:householdId/shopping-list/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");
      const body = await c.req.json();

      // Check if item exists and belongs to household
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Shopping list item not found",
          code: "SHOPPING_LIST_ITEM_NOT_FOUND",
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

        updateData.name = body.name.trim();
      }

      // Validate and update quantity
      if (body.quantity !== undefined) {
        if (body.quantity === null) {
          updateData.quantity = null;
        } else if (typeof body.quantity !== "number" || body.quantity <= 0) {
          const response: ApiResponse = {
            success: false,
            error: "Quantity must be a positive number",
            code: "INVALID_QUANTITY",
          };
          return c.json(response, 400);
        } else {
          updateData.quantity = body.quantity;
        }
      }

      // Validate and update unit
      if (body.unit !== undefined) {
        if (body.unit === null) {
          updateData.unit = null;
        } else if (
          typeof body.unit !== "string" ||
          body.unit.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Unit must be a non-empty string",
            code: "INVALID_UNIT",
          };
          return c.json(response, 400);
        } else if (body.unit.trim().length > 50) {
          const response: ApiResponse = {
            success: false,
            error: "Unit must be 50 characters or less",
            code: "UNIT_TOO_LONG",
          };
          return c.json(response, 400);
        } else {
          updateData.unit = body.unit.trim();
        }
      }

      // Validate and update category
      if (body.category !== undefined) {
        if (body.category === null) {
          updateData.category = null;
        } else if (
          typeof body.category !== "string" ||
          body.category.trim().length === 0
        ) {
          const response: ApiResponse = {
            success: false,
            error: "Category must be a non-empty string",
            code: "INVALID_CATEGORY",
          };
          return c.json(response, 400);
        } else if (body.category.trim().length > 50) {
          const response: ApiResponse = {
            success: false,
            error: "Category must be 50 characters or less",
            code: "CATEGORY_TOO_LONG",
          };
          return c.json(response, 400);
        } else {
          updateData.category = body.category.trim();
        }
      }

      // Validate and update completed status
      if (body.completed !== undefined) {
        if (typeof body.completed !== "boolean") {
          const response: ApiResponse = {
            success: false,
            error: "Completed must be a boolean",
            code: "INVALID_COMPLETED",
          };
          return c.json(response, 400);
        }
        updateData.completed = body.completed;
      }

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No valid fields to update",
          code: "NO_UPDATE_DATA",
        };
        return c.json(response, 400);
      }

      // Update shopping list item
      const updatedItem = await prisma.shoppingListItem.update({
        where: {
          id: itemId,
        },
        data: updateData,
      });

      // Broadcast real-time update
      wsManager.broadcastToHousehold(
        household.id,
        "shopping-list:item-updated",
        {
          householdId: household.id,
          item: updatedItem,
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updatedItem,
        message: "Shopping list item updated successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update shopping list item",
        code: "SHOPPING_LIST_UPDATE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Toggle shopping list item completion status (quick update endpoint)
shoppingListRoutes.patch(
  "/:householdId/shopping-list/:itemId/toggle",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");

      // Check if item exists and belongs to household
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Shopping list item not found",
          code: "SHOPPING_LIST_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Toggle completion status
      const updatedItem = await prisma.shoppingListItem.update({
        where: {
          id: itemId,
        },
        data: {
          completed: !existingItem.completed,
        },
      });

      // Broadcast real-time update
      wsManager.broadcastToHousehold(
        household.id,
        "shopping-list:item-completed",
        {
          householdId: household.id,
          item: updatedItem,
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updatedItem,
        message: `Shopping list item marked as ${updatedItem.completed ? "completed" : "incomplete"}`,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error toggling shopping list item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to toggle shopping list item",
        code: "SHOPPING_LIST_TOGGLE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Delete a shopping list item
shoppingListRoutes.delete(
  "/:householdId/shopping-list/:itemId",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const itemId = c.req.param("itemId");

      // Check if item exists and belongs to household
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          householdId: household.id,
        },
      });

      if (!existingItem) {
        const response: ApiResponse = {
          success: false,
          error: "Shopping list item not found",
          code: "SHOPPING_LIST_ITEM_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      // Delete shopping list item
      await prisma.shoppingListItem.delete({
        where: {
          id: itemId,
        },
      });

      // Broadcast real-time update
      wsManager.broadcastToHousehold(
        household.id,
        "shopping-list:item-deleted",
        {
          householdId: household.id,
          itemId: itemId,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: "Shopping list item deleted successfully",
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting shopping list item:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete shopping list item",
        code: "SHOPPING_LIST_DELETE_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Convert completed shopping list items to inventory
shoppingListRoutes.post(
  "/:householdId/shopping-list/convert-to-inventory",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const body = await c.req.json();

      // Validate input - expect array of item IDs or convert all completed items
      let itemIds: string[] = [];

      if (body.itemIds && Array.isArray(body.itemIds)) {
        itemIds = body.itemIds;

        // Validate all IDs are strings
        if (!itemIds.every((id) => typeof id === "string")) {
          const response: ApiResponse = {
            success: false,
            error: "All item IDs must be strings",
            code: "INVALID_ITEM_IDS",
          };
          return c.json(response, 400);
        }
      } else if (body.convertAllCompleted === true) {
        // Get all completed items
        const completedItems = await prisma.shoppingListItem.findMany({
          where: {
            householdId: household.id,
            completed: true,
          },
          select: {
            id: true,
          },
        });
        itemIds = completedItems.map((item) => item.id);
      } else {
        const response: ApiResponse = {
          success: false,
          error:
            "Either provide itemIds array or set convertAllCompleted to true",
          code: "INVALID_CONVERSION_REQUEST",
        };
        return c.json(response, 400);
      }

      if (itemIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No items to convert",
          code: "NO_ITEMS_TO_CONVERT",
        };
        return c.json(response, 400);
      }

      // Get shopping list items to convert
      const shoppingListItems = await prisma.shoppingListItem.findMany({
        where: {
          id: {
            in: itemIds,
          },
          householdId: household.id,
          completed: true, // Only convert completed items
        },
      });

      if (shoppingListItems.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: "No completed shopping list items found to convert",
          code: "NO_COMPLETED_ITEMS_FOUND",
        };
        return c.json(response, 400);
      }

      const convertedItems: any[] = [];
      const skippedItems: any[] = [];
      const errors: string[] = [];

      // Process each shopping list item
      for (const shoppingItem of shoppingListItems) {
        try {
          // Check if inventory item with same name already exists
          const existingInventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              householdId: household.id,
              name: {
                equals: shoppingItem.name,
                mode: "insensitive",
              },
            },
          });

          if (existingInventoryItem) {
            // Update existing inventory item quantity if both have quantities
            if (shoppingItem.quantity && existingInventoryItem.quantity) {
              // Only add if units match or if shopping item has no unit
              if (
                !shoppingItem.unit ||
                shoppingItem.unit === existingInventoryItem.unit
              ) {
                const updatedInventoryItem = await prisma.inventoryItem.update({
                  where: {
                    id: existingInventoryItem.id,
                  },
                  data: {
                    quantity:
                      existingInventoryItem.quantity + shoppingItem.quantity,
                  },
                });
                convertedItems.push({
                  type: "updated",
                  inventoryItem: updatedInventoryItem,
                  shoppingItem: shoppingItem,
                });
              } else {
                skippedItems.push({
                  shoppingItem: shoppingItem,
                  reason: "Unit mismatch with existing inventory item",
                });
                continue;
              }
            } else {
              skippedItems.push({
                shoppingItem: shoppingItem,
                reason:
                  "Inventory item already exists and quantity cannot be combined",
              });
              continue;
            }
          } else {
            // Create new inventory item
            const newInventoryItem = await prisma.inventoryItem.create({
              data: {
                name: shoppingItem.name,
                quantity: shoppingItem.quantity || 1, // Default to 1 if no quantity specified
                unit: shoppingItem.unit || "item", // Default unit
                category: shoppingItem.category || "Uncategorized",
                householdId: household.id,
              },
            });
            convertedItems.push({
              type: "created",
              inventoryItem: newInventoryItem,
              shoppingItem: shoppingItem,
            });
          }

          // Remove the shopping list item after successful conversion
          await prisma.shoppingListItem.delete({
            where: {
              id: shoppingItem.id,
            },
          });
        } catch (itemError) {
          console.error(
            `Error converting shopping item ${shoppingItem.id}:`,
            itemError
          );
          errors.push(`Failed to convert "${shoppingItem.name}": ${itemError}`);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          converted: convertedItems,
          skipped: skippedItems,
          errors: errors,
          summary: {
            totalRequested: itemIds.length,
            totalFound: shoppingListItems.length,
            totalConverted: convertedItems.length,
            totalSkipped: skippedItems.length,
            totalErrors: errors.length,
          },
        },
        message: `Successfully converted ${convertedItems.length} shopping list items to inventory`,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error converting shopping list to inventory:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to convert shopping list items to inventory",
        code: "SHOPPING_LIST_CONVERSION_ERROR",
      };
      return c.json(response, 500);
    }
  }
);

// Bulk operations for shopping list items
shoppingListRoutes.post(
  "/:householdId/shopping-list/bulk",
  authMiddleware,
  householdAccessMiddleware,
  async (c) => {
    try {
      const household = c.get("household");
      const body = await c.req.json();

      if (
        !body.action ||
        !["complete", "incomplete", "delete"].includes(body.action)
      ) {
        const response: ApiResponse = {
          success: false,
          error:
            "Invalid action. Must be 'complete', 'incomplete', or 'delete'",
          code: "INVALID_BULK_ACTION",
        };
        return c.json(response, 400);
      }

      if (
        !body.itemIds ||
        !Array.isArray(body.itemIds) ||
        body.itemIds.length === 0
      ) {
        const response: ApiResponse = {
          success: false,
          error: "Item IDs array is required and must not be empty",
          code: "INVALID_ITEM_IDS",
        };
        return c.json(response, 400);
      }

      // Validate all IDs are strings
      if (!body.itemIds.every((id: any) => typeof id === "string")) {
        const response: ApiResponse = {
          success: false,
          error: "All item IDs must be strings",
          code: "INVALID_ITEM_IDS",
        };
        return c.json(response, 400);
      }

      // Verify all items belong to the household
      const existingItems = await prisma.shoppingListItem.findMany({
        where: {
          id: {
            in: body.itemIds,
          },
          householdId: household.id,
        },
      });

      if (existingItems.length !== body.itemIds.length) {
        const response: ApiResponse = {
          success: false,
          error: "Some items not found or do not belong to this household",
          code: "ITEMS_NOT_FOUND",
        };
        return c.json(response, 404);
      }

      let result: { count: number };
      let message: string;

      switch (body.action) {
        case "complete":
          result = await prisma.shoppingListItem.updateMany({
            where: {
              id: {
                in: body.itemIds,
              },
              householdId: household.id,
            },
            data: {
              completed: true,
            },
          });
          message = `Marked ${result.count} items as completed`;
          break;

        case "incomplete":
          result = await prisma.shoppingListItem.updateMany({
            where: {
              id: {
                in: body.itemIds,
              },
              householdId: household.id,
            },
            data: {
              completed: false,
            },
          });
          message = `Marked ${result.count} items as incomplete`;
          break;

        case "delete":
          result = await prisma.shoppingListItem.deleteMany({
            where: {
              id: {
                in: body.itemIds,
              },
              householdId: household.id,
            },
          });
          message = `Deleted ${result.count} items`;
          break;

        default:
          // This should never happen due to validation above, but TypeScript needs it
          throw new Error("Invalid action");
      }

      // Broadcast real-time update for bulk operations
      wsManager.broadcastToHousehold(
        household.id,
        "shopping-list:bulk-operation",
        {
          householdId: household.id,
          action: body.action,
          affectedCount: result.count,
        }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          action: body.action,
          affectedCount: result.count,
        },
        message,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to perform bulk operation",
        code: "BULK_OPERATION_ERROR",
      };
      return c.json(response, 500);
    }
  }
);
