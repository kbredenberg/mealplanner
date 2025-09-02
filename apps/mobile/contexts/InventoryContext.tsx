import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useOfflineApi } from "@/hooks/useOfflineApi";
import { useHousehold } from "@/contexts/HouseholdContext";
import { syncManager, SyncConflict } from "@/lib/syncManager";
import { storage } from "@/lib/storage";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  householdId: string;
}

export interface InventoryCategory {
  name: string;
  count: number;
}

interface InventoryContextType {
  items: InventoryItem[];
  categories: InventoryCategory[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  isOnline: boolean;
  pendingOperations: number;
  conflicts: SyncConflict[];

  // Data management
  loadInventory: () => Promise<void>;
  addItem: (data: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    expiryDate?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateItem: (
    id: string,
    data: {
      name?: string;
      quantity?: number;
      unit?: string;
      category?: string;
      expiryDate?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;

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
  getFilteredItems: () => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const api = useApi();
  const offlineApi = useOfflineApi();
  const { currentHousehold } = useHousehold();
  const { isOnline } = offlineApi;

  // Load inventory when household changes
  useEffect(() => {
    if (currentHousehold) {
      loadInventory();
      updatePendingOperationsCount();
    }
  }, [currentHousehold]);

  // Update pending operations count when online status changes
  useEffect(() => {
    updatePendingOperationsCount();
  }, [isOnline]);

  const updatePendingOperationsCount = async () => {
    try {
      const count = await offlineApi.getPendingOperationsCount();
      setPendingOperations(count);
    } catch (error) {
      console.error("Error getting pending operations count:", error);
    }
  };

  const loadInventory = async () => {
    if (!currentHousehold) return;

    try {
      setIsLoading(true);
      setError(null);

      const cacheKey = `inventory_${currentHousehold.id}`;
      const response = await offlineApi.get(
        `/api/households/${currentHousehold.id}/inventory`,
        { cacheKey, cacheMaxAge: 2 * 60 * 1000 } // 2 minutes cache
      );
      const data = await response.json();

      if (data.success) {
        const inventoryData = data.data || [];
        setItems(inventoryData);
        updateCategories(inventoryData);

        // If this was from cache, try to sync in the background
        if ((response as any).fromCache && isOnline) {
          syncData();
        }
      } else {
        setError(data.error || "Failed to load inventory");
      }
    } catch (err) {
      setError("Failed to load inventory");
      console.error("Error loading inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategories = (inventoryItems: InventoryItem[]) => {
    const categoryMap = new Map<string, number>();

    inventoryItems.forEach((item) => {
      const count = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, count + 1);
    });

    const categoryList = Array.from(categoryMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    setCategories(categoryList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addItem = async (data: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    expiryDate?: string;
  }) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await offlineApi.post(
        `/api/households/${currentHousehold.id}/inventory`,
        data,
        { enableOptimisticUpdates: true }
      );
      const result = await response.json();

      if (result.success) {
        // For optimistic updates, immediately add the item to local state
        if ((response as any).pending) {
          const optimisticItem: InventoryItem = {
            id: result.data.id,
            name: data.name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category,
            expiryDate: data.expiryDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            householdId: currentHousehold.id,
          };

          setItems((prev) => [optimisticItem, ...prev]);
          updateCategories([optimisticItem, ...items]);
          await updatePendingOperationsCount();
        } else {
          await loadInventory(); // Reload inventory to get the new item
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
      expiryDate?: string;
    }
  ) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await offlineApi.put(
        `/api/households/${currentHousehold.id}/inventory/${id}`,
        data,
        { enableOptimisticUpdates: true }
      );
      const result = await response.json();

      if (result.success) {
        // For optimistic updates, immediately update the item in local state
        if ((response as any).pending) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, ...data, updatedAt: new Date().toISOString() }
                : item
            )
          );
          await updatePendingOperationsCount();
        } else {
          await loadInventory(); // Reload inventory to get updated data
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

  const deleteItem = async (id: string) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await offlineApi.delete(
        `/api/households/${currentHousehold.id}/inventory/${id}`,
        { enableOptimisticUpdates: true }
      );
      const result = await response.json();

      if (result.success) {
        // For optimistic updates, immediately remove the item from local state
        if ((response as any).pending) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          updateCategories(items.filter((item) => item.id !== id));
          await updatePendingOperationsCount();
        } else {
          await loadInventory(); // Reload inventory
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

  const syncData = async () => {
    if (!currentHousehold || !isOnline) return;

    try {
      setIsLoading(true);

      // Get fresh data from server
      const response = await api.get(
        `/api/households/${currentHousehold.id}/inventory`
      );
      const data = await response.json();

      if (data.success) {
        const serverData = data.data || [];

        // Detect and resolve conflicts
        const syncResult = await syncManager.syncData(
          items,
          serverData,
          currentHousehold.id,
          "inventory",
          "merge" // Use merge strategy for inventory
        );

        if (syncResult.conflicts.length > 0) {
          setConflicts(syncResult.conflicts);
        } else {
          // No conflicts, update with server data
          setItems(serverData);
          updateCategories(serverData);

          // Update cache
          const cacheKey = `inventory_${currentHousehold.id}`;
          await storage.setCache(cacheKey, serverData);
        }

        // Process pending operations
        await offlineApi.processPendingOperations();
        await updatePendingOperationsCount();
      }
    } catch (error) {
      console.error("Error syncing inventory data:", error);
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
            syncManager.mergeInventoryItem
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
          `/api/households/${currentHousehold?.id}/inventory/${conflictId}`,
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
      const cacheKey = `inventory_${currentHousehold.id}`;
      await storage.removeCache(cacheKey);

      // Clear sync metadata
      await syncManager.clearSyncData(currentHousehold.id);

      // Clear pending operations
      await offlineApi.clearPendingOperations();
      await updatePendingOperationsCount();

      // Clear conflicts
      setConflicts([]);

      // Reload data
      await loadInventory();
    } catch (error) {
      console.error("Error clearing offline data:", error);
    }
  };

  const getFilteredItems = () => {
    let filtered = items;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  const value: InventoryContextType = {
    items,
    categories,
    isLoading,
    error,
    searchQuery,
    selectedCategory,
    isOnline,
    pendingOperations,
    conflicts,
    loadInventory,
    addItem,
    updateItem,
    deleteItem,
    syncData,
    resolveConflict,
    clearOfflineData,
    setSearchQuery,
    setSelectedCategory,
    getFilteredItems,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
