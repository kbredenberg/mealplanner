import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useHousehold } from "@/contexts/HouseholdContext";

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

  const api = useApi();
  const { currentHousehold } = useHousehold();

  // Load inventory when household changes
  useEffect(() => {
    if (currentHousehold) {
      loadInventory();
    }
  }, [currentHousehold]);

  const loadInventory = async () => {
    if (!currentHousehold) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(
        `/api/households/${currentHousehold.id}/inventory`
      );
      const data = await response.json();

      if (data.success) {
        setItems(data.data || []);
        updateCategories(data.data || []);
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

      const response = await api.post(
        `/api/households/${currentHousehold.id}/inventory`,
        data
      );
      const result = await response.json();

      if (result.success) {
        await loadInventory(); // Reload inventory to get the new item
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

      const response = await api.put(
        `/api/households/${currentHousehold.id}/inventory/${id}`,
        data
      );
      const result = await response.json();

      if (result.success) {
        await loadInventory(); // Reload inventory to get updated data
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

      const response = await api.delete(
        `/api/households/${currentHousehold.id}/inventory/${id}`
      );
      const result = await response.json();

      if (result.success) {
        await loadInventory(); // Reload inventory
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
    loadInventory,
    addItem,
    updateItem,
    deleteItem,
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
