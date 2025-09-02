import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useHousehold } from "@/contexts/HouseholdContext";
import { Recipe } from "@/contexts/RecipeContext";

export interface MealPlanItem {
  id: string;
  date: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  cooked: boolean;
  cookedAt?: string;
  notes?: string;
  mealPlanId: string;
  recipeId?: string;
  recipe?: Recipe;
}

export interface MealPlan {
  id: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
  updatedAt: string;
  householdId: string;
  meals: MealPlanItem[];
}

export interface IngredientAvailability {
  ingredientName: string;
  required: number;
  available: number;
  unit: string;
  sufficient: boolean;
}

export interface MealAvailability {
  recipeId: string;
  recipeName: string;
  canCook: boolean;
  missingIngredients: IngredientAvailability[];
}

interface MealPlanContextType {
  currentMealPlan: MealPlan | null;
  isLoading: boolean;
  error: string | null;

  // Data management
  loadMealPlan: (weekStart: string) => Promise<void>;
  createMealPlan: (
    weekStart: string
  ) => Promise<{ success: boolean; error?: string; data?: MealPlan }>;
  addMealToSlot: (data: {
    date: string;
    mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
    recipeId: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  removeMealFromSlot: (
    mealItemId: string
  ) => Promise<{ success: boolean; error?: string }>;
  markMealAsCooked: (
    mealItemId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Ingredient availability checking
  checkIngredientAvailability: (
    recipeId: string
  ) => Promise<MealAvailability | null>;
  checkWeekAvailability: () => Promise<MealAvailability[]>;

  // Utility functions
  getMealsForDate: (date: string) => MealPlanItem[];
  getMealForSlot: (date: string, mealType: string) => MealPlanItem | null;
  getCurrentWeekStart: () => string;
  getWeekDates: (weekStart: string) => string[];
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(
  undefined
);

export function MealPlanProvider({ children }: { children: React.ReactNode }) {
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();
  const { currentHousehold } = useHousehold();

  // Load current week's meal plan when household changes
  useEffect(() => {
    if (currentHousehold) {
      const weekStart = getCurrentWeekStart();
      loadMealPlan(weekStart);
    }
  }, [currentHousehold]);

  const getCurrentWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek; // Adjust to get Monday as start of week
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const getWeekDates = (weekStart: string) => {
    const dates = [];
    const start = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
  };

  const loadMealPlan = async (weekStart: string) => {
    if (!currentHousehold) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(
        `/api/households/${currentHousehold.id}/meal-plans?weekStart=${weekStart}`
      );
      const data = await response.json();

      if (data.success) {
        setCurrentMealPlan(data.data);
      } else {
        // If no meal plan exists for this week, create one
        if (data.error?.includes("not found")) {
          const createResult = await createMealPlan(weekStart);
          if (createResult.success && createResult.data) {
            setCurrentMealPlan(createResult.data);
          } else {
            setError(createResult.error || "Failed to create meal plan");
          }
        } else {
          setError(data.error || "Failed to load meal plan");
        }
      }
    } catch (err) {
      setError("Failed to load meal plan");
      console.error("Error loading meal plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const createMealPlan = async (weekStart: string) => {
    if (!currentHousehold) {
      return { success: false, error: "No household selected" };
    }

    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const response = await api.post(
        `/api/households/${currentHousehold.id}/meal-plans`,
        {
          weekStart,
          weekEnd: weekEnd.toISOString().split("T")[0],
        }
      );
      const result = await response.json();

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || "Failed to create meal plan",
        };
      }
    } catch (err) {
      console.error("Error creating meal plan:", err);
      return { success: false, error: "Failed to create meal plan" };
    }
  };

  const addMealToSlot = async (data: {
    date: string;
    mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
    recipeId: string;
    notes?: string;
  }) => {
    if (!currentMealPlan) {
      return { success: false, error: "No meal plan loaded" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/api/households/${currentHousehold?.id}/meal-plans/${currentMealPlan.id}/meals`,
        data
      );
      const result = await response.json();

      if (result.success) {
        // Reload the meal plan to get updated data
        await loadMealPlan(currentMealPlan.weekStart);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to add meal",
        };
      }
    } catch (err) {
      console.error("Error adding meal:", err);
      return { success: false, error: "Failed to add meal" };
    } finally {
      setIsLoading(false);
    }
  };

  const removeMealFromSlot = async (mealItemId: string) => {
    if (!currentMealPlan) {
      return { success: false, error: "No meal plan loaded" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(
        `/api/households/${currentHousehold?.id}/meal-plans/${currentMealPlan.id}/meals/${mealItemId}`
      );
      const result = await response.json();

      if (result.success) {
        // Reload the meal plan to get updated data
        await loadMealPlan(currentMealPlan.weekStart);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to remove meal",
        };
      }
    } catch (err) {
      console.error("Error removing meal:", err);
      return { success: false, error: "Failed to remove meal" };
    } finally {
      setIsLoading(false);
    }
  };

  const markMealAsCooked = async (mealItemId: string) => {
    if (!currentMealPlan) {
      return { success: false, error: "No meal plan loaded" };
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/api/households/${currentHousehold?.id}/meal-plans/${currentMealPlan.id}/meals/${mealItemId}/cook`
      );
      const result = await response.json();

      if (result.success) {
        // Reload the meal plan to get updated data
        await loadMealPlan(currentMealPlan.weekStart);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to mark meal as cooked",
        };
      }
    } catch (err) {
      console.error("Error marking meal as cooked:", err);
      return { success: false, error: "Failed to mark meal as cooked" };
    } finally {
      setIsLoading(false);
    }
  };

  const checkIngredientAvailability = async (
    recipeId: string
  ): Promise<MealAvailability | null> => {
    if (!currentHousehold) return null;

    try {
      const response = await api.get(
        `/api/households/${currentHousehold.id}/meal-plans/check-availability/${recipeId}`
      );
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error("Error checking availability:", data.error);
        return null;
      }
    } catch (err) {
      console.error("Error checking ingredient availability:", err);
      return null;
    }
  };

  const checkWeekAvailability = async (): Promise<MealAvailability[]> => {
    if (!currentMealPlan) return [];

    try {
      const response = await api.get(
        `/api/households/${currentHousehold?.id}/meal-plans/${currentMealPlan.id}/check-week-availability`
      );
      const data = await response.json();

      if (data.success) {
        return data.data || [];
      } else {
        console.error("Error checking week availability:", data.error);
        return [];
      }
    } catch (err) {
      console.error("Error checking week availability:", err);
      return [];
    }
  };

  const getMealsForDate = (date: string): MealPlanItem[] => {
    if (!currentMealPlan) return [];

    return currentMealPlan.meals.filter((meal) => meal.date === date);
  };

  const getMealForSlot = (
    date: string,
    mealType: string
  ): MealPlanItem | null => {
    if (!currentMealPlan) return null;

    return (
      currentMealPlan.meals.find(
        (meal) => meal.date === date && meal.mealType === mealType
      ) || null
    );
  };

  const value: MealPlanContextType = {
    currentMealPlan,
    isLoading,
    error,
    loadMealPlan,
    createMealPlan,
    addMealToSlot,
    removeMealFromSlot,
    markMealAsCooked,
    checkIngredientAvailability,
    checkWeekAvailability,
    getMealsForDate,
    getMealForSlot,
    getCurrentWeekStart,
    getWeekDates,
  };

  return (
    <MealPlanContext.Provider value={value}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (context === undefined) {
    throw new Error("useMealPlan must be used within a MealPlanProvider");
  }
  return context;
}
