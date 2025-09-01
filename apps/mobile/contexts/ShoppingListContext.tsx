import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useHousehold } from "@/contexts/HouseholdContext";

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
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const api = useApi();
  const { currentHousehold } = useHousehold();

  // Load shopping list when household changes
  useEffect(() => {
    if (currentHousehold) {
      loadShoppingList();
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentHousehold]);

  const connectWebSocket = () => {
    if (!currentHousehold || ws) return;

    try {
      // Get the base URL and convert to WebSocket URL
      const baseUrl = api.getBaseUrl();
      const wsUrl = baseUrl
        .replace(/^https:\/\//, "wss://")
        .replace(/^http:\/\//, "ws://");

      const websocket = new WebSocket(`${wsUrl}/ws`);

      websocket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);

        // Subscribe to household updates
        websocket.send(
          JSON.stringify({
            type: "subscribe-household",
            householdId: currentHousehold.id,
          })
        );
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setWs(null);

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (currentHousehold) {
            connectWebSocket();
          }
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      setWs(websocket);
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (!currentHousehold) return;

    switch (message.type) {
      case "shopping-list:item-added":
        if (message.data.householdId === currentHousehold.id) {
          setItems((prev) => [message.data.item, ...prev]);
          updateCategories([message.data.item, ...items]);
        }
        break;

      case "shopping-list:item-updated":
      case "shopping-list:item-completed":
        if (message.data.householdId === currentHousehold.id) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === message.data.item.id ? message.data.item : item
            )
          );
        }
        break;

      case "shopping-list:item-deleted":
        if (message.data.householdId === currentHousehold.id) {
          setItems((prev) =>
            prev.filter((item) => item.id !== message.data.itemId)
          );
          updateCategories(
            items.filter((item) => item.id !== message.data.itemId)
          );
        }
        break;

      case "shopping-list:bulk-operation":
        if (message.data.householdId === currentHousehold.id) {
          // Reload the shopping list after bulk operations
          loadShoppingList();
        }
        break;

      case "connected":
      case "subscribed":
        console.log("WebSocket:", message.message || message.type);
        break;

      case "error":
        console.error("WebSocket error:", message.message);
        break;
    }
  };

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
    loadShoppingList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    bulkOperation,
    convertToInventory,
    setSearchQuery,
    setSelectedCategory,
    setShowCompleted,
    getFilteredItems,
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
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
