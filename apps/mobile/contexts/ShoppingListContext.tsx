import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useOfflineApi } from "@/hooks/useOfflineApi";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useWebSocket, useWebSocketEvent } from "@/hooks/useWebSocket";
import { syncManager, SyncConflict } from "@/lib/syncManager";
import { storage } from "@/lib/storage";

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  householdId: string;
}

export interface ShoppingListCategory {
  name: string;
  count: number;
}

interface ShoppingListContextType {
  items: ShoppingListItem[];
  categories: ShoppingListCategory[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  showCompleted: boolean;
  isOnline: boolean;
  pendingOperations: number;
  conflicts: SyncConflict[];

  // Data management
  loadShoppingList: () => Promise<void>;
  addItem: (data: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateItem: (
    id: string,
    data: {
      name?: string;
      quantity?: number;
      unit?: string;
      category?: string;
      completed?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  toggleItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkOperation: (
    action: "complete" | "incomplete" | "delete",
    itemIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  convertToInventory: (
    itemIds?: string[]
  ) => Promise<{ success: boolean; error?: string; data?: any }>;

  // Offline support
  syncData: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: "local" | "server" | "merge"
  ) => Promise<void>;
  clearOfflineData: () => Promise<void>;

  // Filtering and search
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setShowCompleted: (show: boolean) => void;
  getFilteredItems: () => ShoppingListItem[];

  // WebSocket connection
  isConnected: boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(
  undefined
);

export function ShoppingListProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [categories, setCategories] = useState<ShoppingListCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const api = useApi();
  const offlineApi = useOfflineApi();
  const { currentHousehold } = useHousehold();
  const { isOnline } = offlineApi;
  const { isConnected, connect, disconnect } = useWebSocket({
    householdId: currentHousehold?.id,
    autoConnect: true,
  });

  // Handle real-time shopping list updates
  useWebSocketEvent(
    "shopping-list:item-added",
    (data) => {
      if (data.householdId === currentHousehold?.id) {
        setItems((prev) => [data.item, ...prev]);
        updateCategories([data.item, ...items]);
      }
    },
    [currentHousehold?.id, items]
  );

  useWebSocketEvent(
    "shopping-list:item-updated",
    (data) => {
      if (data.householdId === currentHousehold?.id) {
        setItems((prev) =>
          prev.map((item) => (item.id === data.item.id ? data.item : item))
        );
      }
    },
    [currentHousehold?.id]
  );

  useWebSocketEvent(
    "shopping-list:item-completed",
    (data) => {
      if (data.householdId === currentHousehold?.id) {
        setItems((prev) =>
          prev.map((item) => (item.id === data.item.id ? data.item : item))
        );
      }
    },
    [currentHousehold?.id]
  );

  useWebSocketEvent(
    "shopping-list:item-deleted",
    (data) => {
      if (data.householdId === currentHousehold?.id) {
        setItems((prev) => prev.filter((item) => item.id !== data.itemId));
        updateCategories(items.filter((item) => item.id !== data.itemId));
      }
    },
    [currentHousehold?.id, items]
  );

  useWebSocketEvent(
    "shopping-list:bulk-operation",
    (data) => {
      if (data.householdId === currentHousehold?.id) {
        // Reload the shopping list after bulk operations
        loadShoppingList();
      }
    },
    [currentHousehold?.id]
  );

  // Load shopping list when household changes
  useEffect(() => {
    if (currentHousehold) {
      loadShoppingList();
    }
  }, [currentHousehold]);

  const loadShoppingList = async () => {
    if (!currentHousehold) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(
        `/api/households/${currentHousehold.id}/shopping-list`
      );
      const data = await response.json();

      if (data.success) {
        setItems(data.data || []);
        updateCategories(data.data || []);
      } else {
        setError(data.error || "Failed to load shopping list");
      }
    } catch (err) {
      setError("Failed to load shopping list");
      console.error("Error loading shopping list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategories = (shoppingItems: ShoppingListItem[]) => {
    const categoryMap = new Map<string, number>();

    shoppingItems.forEach((item) => {
      if (item.category) {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + 1);
      }
    });

    const categoryList = Array.from(categoryMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    setCategories(categoryList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addItem = async (data: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
  }) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/api/households/${currentHousehold.id}/shopping-list`,
        data
      );
      const result = await response.json();

      if (result.success) {
        // Item will be added via WebSocket, but fallback to reload if not connected
        if (!isConnected) {
          await loadShoppingList();
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to add item",
        };
      }
    } catch (err) {
      console.error("Error adding item:", err);
      return { success: false, error: "Failed to add item" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (
    id: string,
    data: {
      name?: string;
      quantity?: number;
      unit?: string;
      category?: string;
      completed?: boolean;
    }
  ) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(
        `/api/households/${currentHousehold.id}/shopping-list/${id}`,
        data
      );
      const result = await response.json();

      if (result.success) {
        // Item will be updated via WebSocket, but fallback to reload if not connected
        if (!isConnected) {
          await loadShoppingList();
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update item",
        };
      }
    } catch (err) {
      console.error("Error updating item:", err);
      return { success: false, error: "Failed to update item" };
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = async (id: string) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      const response = await api.patch(
        `/api/households/${currentHousehold.id}/shopping-list/${id}/toggle`
      );
      const result = await response.json();

      if (result.success) {
        // Item will be updated via WebSocket, but fallback to reload if not connected
        if (!isConnected) {
          await loadShoppingList();
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to toggle item",
        };
      }
    } catch (err) {
      console.error("Error toggling item:", err);
      return { success: false, error: "Failed to toggle item" };
    }
  };

  const deleteItem = async (id: string) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(
        `/api/households/${currentHousehold.id}/shopping-list/${id}`
      );
      const result = await response.json();

      if (result.success) {
        // Item will be removed via WebSocket, but fallback to reload if not connected
        if (!isConnected) {
          await loadShoppingList();
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to delete item",
        };
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      return { success: false, error: "Failed to delete item" };
    } finally {
      setIsLoading(false);
    }
  };

  const bulkOperation = async (
    action: "complete" | "incomplete" | "delete",
    itemIds: string[]
  ) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/api/households/${currentHousehold.id}/shopping-list/bulk`,
        { action, itemIds }
      );
      const result = await response.json();

      if (result.success) {
        // Items will be updated via WebSocket, but fallback to reload if not connected
        if (!isConnected) {
          await loadShoppingList();
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to perform bulk operation",
        };
      }
    } catch (err) {
      console.error("Error performing bulk operation:", err);
      return { success: false, error: "Failed to perform bulk operation" };
    } finally {
      setIsLoading(false);
    }
  };

  const convertToInventory = async (itemIds?: string[]) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const requestData = itemIds ? { itemIds } : { convertAllCompleted: true };

      const response = await api.post(
        `/api/households/${currentHousehold.id}/shopping-list/convert-to-inventory`,
        requestData
      );
      const result = await response.json();

      if (result.success) {
        // Reload shopping list to reflect changes
        await loadShoppingList();
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || "Failed to convert items to inventory",
        };
      }
    } catch (err) {
      console.error("Error converting to inventory:", err);
      return { success: false, error: "Failed to convert items to inventory" };
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async () => {
    if (!currentHousehold || !isOnline) return;

    try {
      setIsLoading(true);

      // Get fresh data from server
      const response = await api.get(
        `/api/households/${currentHousehold.id}/shopping-list`
      );
      const data = await response.json();

      if (data.success) {
        const serverData = data.data || [];

        // Detect and resolve conflicts
        const syncResult = await syncManager.syncData(
          items,
          serverData,
          currentHousehold.id,
          "shopping-list",
          "merge" // Use merge strategy for shopping list
        );

        if (syncResult.conflicts.length > 0) {
          setConflicts(syncResult.conflicts);
        } else {
          // No conflicts, update with server data
          setItems(serverData);
          updateCategories(serverData);

          // Update cache
          const cacheKey = `shopping_list_${currentHousehold.id}`;
          await storage.setCache(cacheKey, serverData);
        }

        // Process pending operations
        await offlineApi.processPendingOperations();
        await updatePendingOperationsCount();
      }
    } catch (error) {
      console.error("Error syncing shopping list data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: "local" | "server" | "merge"
  ) => {
    const conflict = conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    try {
      let resolvedData;
      switch (resolution) {
        case "local":
          resolvedData = await syncManager.resolveConflict(
            conflict,
            "client-wins"
          );
          break;
        case "server":
          resolvedData = await syncManager.resolveConflict(
            conflict,
            "server-wins"
          );
          break;
        case "merge":
          resolvedData = await syncManager.resolveConflict(
            conflict,
            "merge",
            syncManager.mergeShoppingListItem
          );
          break;
      }

      // Update the item in local state
      setItems((prev) =>
        prev.map((item) => (item.id === conflictId ? resolvedData : item))
      );

      // Remove the conflict
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));

      // Update the server with resolved data
      if (isOnline) {
        await api.put(
          `/api/households/${currentHousehold?.id}/shopping-list/${conflictId}`,
          resolvedData
        );
      }
    } catch (error) {
      console.error("Error resolving conflict:", error);
    }
  };

  const clearOfflineData = async () => {
    if (!currentHousehold) return;

    try {
      // Clear cache
      const cacheKey = `shopping_list_${currentHousehold.id}`;
      await storage.removeCache(cacheKey);

      // Clear sync metadata
      await syncManager.clearSyncData(currentHousehold.id);

      // Clear pending operations
      await offlineApi.clearPendingOperations();
      await updatePendingOperationsCount();

      // Clear conflicts
      setConflicts([]);

      // Reload data
      await loadShoppingList();
    } catch (error) {
      console.error("Error clearing offline data:", error);
    }
  };

  const updatePendingOperationsCount = async () => {
    try {
      const count = await offlineApi.getPendingOperationsCount();
      setPendingOperations(count);
    } catch (error) {
      console.error("Error getting pending operations count:", error);
    }
  };

  const getFilteredItems = () => {
    let filtered = items;

    // Filter by completion status
    if (!showCompleted) {
      filtered = filtered.filter((item) => !item.completed);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    return filtered.sort((a, b) => {
      // Sort by completion status first (incomplete items first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  };

  const value: ShoppingListContextType = {
    items,
    categories,
    isLoading,
    error,
    searchQuery,
    selectedCategory,
    showCompleted,
    isOnline,
    pendingOperations,
    conflicts,
    loadShoppingList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    bulkOperation,
    convertToInventory,
    syncData,
    resolveConflict,
    clearOfflineData,
    setSearchQuery,
    setSelectedCategory,
    setShowCompleted,
    getFilteredItems,
    isConnected,
    connectWebSocket: connect,
    disconnectWebSocket: disconnect,
  };

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext);
  if (context === undefined) {
    throw new Error(
      "useShoppingList must be used within a ShoppingListProvider"
    );
  }
  return context;
}
