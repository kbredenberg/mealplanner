import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useHousehold } from "@/contexts/HouseholdContext";

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  notes?: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  ingredients: RecipeIngredient[];
  _count?: {
    mealPlanItems: number;
  };
}

interface RecipeContextType {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  availableTags: string[];

  // Data management
  loadRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<Recipe[]>;
  getRecipe: (id: string) => Promise<Recipe | null>;
  createRecipe: (data: {
    name: string;
    description?: string;
    instructions: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    tags?: string[];
    ingredients: Array<{
      quantity: number;
      unit: string;
      notes?: string;
      inventoryItemId?: string;
    }>;
  }) => Promise<{ success: boolean; error?: string; data?: Recipe }>;
  updateRecipe: (
    id: string,
    data: {
      name?: string;
      description?: string;
      instructions?: string;
      prepTime?: number;
      cookTime?: number;
      servings?: number;
      tags?: string[];
      ingredients?: Array<{
        quantity: number;
        unit: string;
        notes?: string;
        inventoryItemId?: string;
      }>;
    }
  ) => Promise<{ success: boolean; error?: string; data?: Recipe }>;
  deleteRecipe: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Filtering and search
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  getFilteredRecipes: () => Recipe[];
  loadAvailableTags: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const api = useApi();
  const { currentHousehold } = useHousehold();

  // Load recipes when household changes
  useEffect(() => {
    if (currentHousehold) {
      loadRecipes();
      loadAvailableTags();
    }
  }, [currentHousehold]);

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get("/api/recipes");
      const data = await response.json();

      if (data.success) {
        setRecipes(data.data || []);
      } else {
        setError(data.error || "Failed to load recipes");
      }
    } catch (err) {
      setError("Failed to load recipes");
      console.error("Error loading recipes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchRecipes = async (query: string): Promise<Recipe[]> => {
    if (!query.trim()) {
      return recipes;
    }

    try {
      const response = await api.get(
        `/api/recipes/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (data.success) {
        return data.data || [];
      } else {
        console.error("Search error:", data.error);
        return [];
      }
    } catch (err) {
      console.error("Error searching recipes:", err);
      return [];
    }
  };

  const getRecipe = async (id: string): Promise<Recipe | null> => {
    try {
      const response = await api.get(`/api/recipes/${id}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error("Get recipe error:", data.error);
        return null;
      }
    } catch (err) {
      console.error("Error getting recipe:", err);
      return null;
    }
  };

  const createRecipe = async (data: {
    name: string;
    description?: string;
    instructions: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    tags?: string[];
    ingredients: Array<{
      quantity: number;
      unit: string;
      notes?: string;
      inventoryItemId?: string;
    }>;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post("/api/recipes", data);
      const result = await response.json();

      if (result.success) {
        await loadRecipes(); // Reload recipes to get the new one
        await loadAvailableTags(); // Reload tags
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || "Failed to create recipe",
        };
      }
    } catch (err) {
      console.error("Error creating recipe:", err);
      return { success: false, error: "Failed to create recipe" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecipe = async (
    id: string,
    data: {
      name?: string;
      description?: string;
      instructions?: string;
      prepTime?: number;
      cookTime?: number;
      servings?: number;
      tags?: string[];
      ingredients?: Array<{
        quantity: number;
        unit: string;
        notes?: string;
        inventoryItemId?: string;
      }>;
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(`/api/recipes/${id}`, data);
      const result = await response.json();

      if (result.success) {
        await loadRecipes(); // Reload recipes to get updated data
        await loadAvailableTags(); // Reload tags
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update recipe",
        };
      }
    } catch (err) {
      console.error("Error updating recipe:", err);
      return { success: false, error: "Failed to update recipe" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(`/api/recipes/${id}`);
      const result = await response.json();

      if (result.success) {
        await loadRecipes(); // Reload recipes
        await loadAvailableTags(); // Reload tags
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to delete recipe",
        };
      }
    } catch (err) {
      console.error("Error deleting recipe:", err);
      return { success: false, error: "Failed to delete recipe" };
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const response = await api.get("/api/recipes/tags/list");
      const data = await response.json();

      if (data.success) {
        setAvailableTags(data.data || []);
      }
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  };

  const getFilteredRecipes = () => {
    let filtered = recipes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          recipe.ingredients.some((ingredient) =>
            ingredient.inventoryItem?.name.toLowerCase().includes(query)
          )
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedTags.some((tag) => recipe.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  const value: RecipeContextType = {
    recipes,
    isLoading,
    error,
    searchQuery,
    selectedTags,
    availableTags,
    loadRecipes,
    searchRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    setSearchQuery,
    setSelectedTags,
    getFilteredRecipes,
    loadAvailableTags,
  };

  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  );
}

export function useRecipe() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error("useRecipe must be used within a RecipeProvider");
  }
  return context;
}
