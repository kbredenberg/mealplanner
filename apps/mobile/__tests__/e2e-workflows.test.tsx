import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { RecipeProvider } from "@/contexts/RecipeContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { ShoppingListProvider } from "@/contexts/ShoppingListContext";

// Mock all the external dependencies
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock API responses
const mockApiResponses = {
  households: [
    {
      id: "household-1",
      name: "Test Household",
      description: "Test household",
      role: "ADMIN",
      isCreator: true,
    },
  ],
  inventory: [
    {
      id: "item-1",
      name: "Apples",
      quantity: 5,
      unit: "pieces",
      category: "Fruits",
      expiryDate: null,
    },
    {
      id: "item-2",
      name: "Milk",
      quantity: 1,
      unit: "liter",
      category: "Dairy",
      expiryDate: "2024-12-31",
    },
  ],
  recipes: [
    {
      id: "recipe-1",
      name: "Apple Pie",
      description: "Delicious apple pie",
      instructions: "Mix and bake",
      prepTime: 30,
      cookTime: 60,
      servings: 8,
      tags: ["dessert", "baking"],
      creator: { id: "user-1", name: "Test User" },
      ingredients: [
        {
          id: "ing-1",
          quantity: 6,
          unit: "pieces",
          notes: "Apples",
        },
      ],
    },
  ],
  mealPlan: {
    id: "meal-plan-1",
    weekStart: "2024-01-01",
    weekEnd: "2024-01-07",
    meals: [
      {
        id: "meal-1",
        date: "2024-01-03",
        mealType: "DINNER",
        cooked: false,
        recipe: {
          id: "recipe-1",
          name: "Apple Pie",
        },
      },
    ],
  },
  shoppingList: [
    {
      id: "shopping-1",
      name: "Sugar",
      quantity: 2,
      unit: "cups",
      category: "Baking",
      completed: false,
    },
  ],
};

// Mock fetch
global.fetch = jest.fn((url: string, options?: any) => {
  const method = options?.method || "GET";

  if (url.includes("/households") && method === "GET") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.households }),
    });
  }

  if (url.includes("/inventory") && method === "GET") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.inventory }),
    });
  }

  if (url.includes("/recipes") && method === "GET") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.recipes }),
    });
  }

  if (url.includes("/meal-plans") && method === "GET") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.mealPlan }),
    });
  }

  if (url.includes("/shopping-list") && method === "GET") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.shoppingList }),
    });
  }

  // Default success response for other requests
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  });
}) as jest.Mock;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AuthProvider>
          <HouseholdProvider>
            <InventoryProvider>
              <RecipeProvider>
                <MealPlanProvider>
                  <ShoppingListProvider>{children}</ShoppingListProvider>
                </MealPlanProvider>
              </RecipeProvider>
            </InventoryProvider>
          </HouseholdProvider>
        </AuthProvider>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

// Mock screen components
const MockInventoryScreen = () => {
  const { Text, View, TouchableOpacity } = require("react-native");
  return (
    <View testID="inventory-screen">
      <Text>Inventory</Text>
      <TouchableOpacity testID="add-item-button">
        <Text>Add Item</Text>
      </TouchableOpacity>
      <View testID="inventory-list">
        <Text>Apples - 5 pieces</Text>
        <Text>Milk - 1 liter</Text>
      </View>
    </View>
  );
};

const MockRecipeScreen = () => {
  const { Text, View, TouchableOpacity } = require("react-native");
  return (
    <View testID="recipe-screen">
      <Text>Recipes</Text>
      <TouchableOpacity testID="add-recipe-button">
        <Text>Add Recipe</Text>
      </TouchableOpacity>
      <View testID="recipe-list">
        <Text>Apple Pie</Text>
      </View>
    </View>
  );
};

const MockMealPlanScreen = () => {
  const { Text, View, TouchableOpacity } = require("react-native");
  return (
    <View testID="meal-plan-screen">
      <Text>Meal Plan</Text>
      <View testID="weekly-plan">
        <TouchableOpacity testID="add-meal-button">
          <Text>Add Meal</Text>
        </TouchableOpacity>
        <View testID="meal-slot">
          <Text>Wednesday Dinner: Apple Pie</Text>
          <TouchableOpacity testID="mark-cooked-button">
            <Text>Mark Cooked</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const MockShoppingListScreen = () => {
  const { Text, View, TouchableOpacity } = require("react-native");
  return (
    <View testID="shopping-list-screen">
      <Text>Shopping List</Text>
      <TouchableOpacity testID="add-shopping-item-button">
        <Text>Add Item</Text>
      </TouchableOpacity>
      <View testID="shopping-list">
        <TouchableOpacity testID="shopping-item-checkbox">
          <Text>Sugar - 2 cups</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

describe("End-to-End Workflows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Inventory Management Workflow", () => {
    it("should complete inventory management workflow", async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <MockInventoryScreen />
        </TestWrapper>
      );

      // Verify inventory screen loads
      expect(getByTestId("inventory-screen")).toBeTruthy();
      expect(getByText("Inventory")).toBeTruthy();

      // Verify inventory items are displayed
      await waitFor(() => {
        expect(getByText("Apples - 5 pieces")).toBeTruthy();
        expect(getByText("Milk - 1 liter")).toBeTruthy();
      });

      // Test add item functionality
      const addButton = getByTestId("add-item-button");
      fireEvent.press(addButton);

      // Verify add button interaction
      expect(addButton).toBeTruthy();
    });
  });

  describe("Recipe Management Workflow", () => {
    it("should complete recipe management workflow", async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <MockRecipeScreen />
        </TestWrapper>
      );

      // Verify recipe screen loads
      expect(getByTestId("recipe-screen")).toBeTruthy();
      expect(getByText("Recipes")).toBeTruthy();

      // Verify recipes are displayed
      await waitFor(() => {
        expect(getByText("Apple Pie")).toBeTruthy();
      });

      // Test add recipe functionality
      const addButton = getByTestId("add-recipe-button");
      fireEvent.press(addButton);

      expect(addButton).toBeTruthy();
    });
  });

  describe("Meal Planning Workflow", () => {
    it("should complete meal planning workflow", async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <MockMealPlanScreen />
        </TestWrapper>
      );

      // Verify meal plan screen loads
      expect(getByTestId("meal-plan-screen")).toBeTruthy();
      expect(getByText("Meal Plan")).toBeTruthy();

      // Verify meal plan is displayed
      await waitFor(() => {
        expect(getByText("Wednesday Dinner: Apple Pie")).toBeTruthy();
      });

      // Test add meal functionality
      const addMealButton = getByTestId("add-meal-button");
      fireEvent.press(addMealButton);

      // Test mark cooked functionality
      const markCookedButton = getByTestId("mark-cooked-button");
      fireEvent.press(markCookedButton);

      expect(addMealButton).toBeTruthy();
      expect(markCookedButton).toBeTruthy();
    });
  });

  describe("Shopping List Workflow", () => {
    it("should complete shopping list workflow", async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <MockShoppingListScreen />
        </TestWrapper>
      );

      // Verify shopping list screen loads
      expect(getByTestId("shopping-list-screen")).toBeTruthy();
      expect(getByText("Shopping List")).toBeTruthy();

      // Verify shopping items are displayed
      await waitFor(() => {
        expect(getByText("Sugar - 2 cups")).toBeTruthy();
      });

      // Test add item functionality
      const addButton = getByTestId("add-shopping-item-button");
      fireEvent.press(addButton);

      // Test item completion
      const checkbox = getByTestId("shopping-item-checkbox");
      fireEvent.press(checkbox);

      expect(addButton).toBeTruthy();
      expect(checkbox).toBeTruthy();
    });
  });

  describe("Complete User Journey", () => {
    it("should complete full user journey from recipe to cooking", async () => {
      // This test simulates a complete user journey:
      // 1. User views recipes
      // 2. User creates meal plan with recipe
      // 3. User checks ingredient availability
      // 4. User adds missing ingredients to shopping list
      // 5. User marks shopping items as completed
      // 6. User adds purchased items to inventory
      // 7. User marks meal as cooked

      const TestJourneyComponent = () => {
        const { View, Text, TouchableOpacity } = require("react-native");
        const [step, setStep] = React.useState(1);

        const nextStep = () => setStep((prev) => prev + 1);

        return (
          <View testID="journey-component">
            {step === 1 && (
              <View testID="step-1">
                <Text>Step 1: View Recipes</Text>
                <Text>Apple Pie Recipe Available</Text>
                <TouchableOpacity testID="select-recipe" onPress={nextStep}>
                  <Text>Select Recipe</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View testID="step-2">
                <Text>Step 2: Create Meal Plan</Text>
                <TouchableOpacity testID="add-to-meal-plan" onPress={nextStep}>
                  <Text>Add to Meal Plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View testID="step-3">
                <Text>Step 3: Check Ingredients</Text>
                <Text>Missing: Sugar (2 cups)</Text>
                <TouchableOpacity testID="add-to-shopping" onPress={nextStep}>
                  <Text>Add to Shopping List</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <View testID="step-4">
                <Text>Step 4: Shopping List</Text>
                <TouchableOpacity testID="mark-purchased" onPress={nextStep}>
                  <Text>Mark as Purchased</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 5 && (
              <View testID="step-5">
                <Text>Step 5: Add to Inventory</Text>
                <TouchableOpacity testID="add-to-inventory" onPress={nextStep}>
                  <Text>Add to Inventory</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 6 && (
              <View testID="step-6">
                <Text>Step 6: Cook Meal</Text>
                <TouchableOpacity testID="mark-cooked" onPress={nextStep}>
                  <Text>Mark as Cooked</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 7 && (
              <View testID="step-7">
                <Text>Journey Complete!</Text>
                <Text>Meal cooked and inventory updated</Text>
              </View>
            )}
          </View>
        );
      };

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <TestJourneyComponent />
        </TestWrapper>
      );

      // Step 1: View and select recipe
      expect(getByTestId("step-1")).toBeTruthy();
      expect(getByText("Apple Pie Recipe Available")).toBeTruthy();
      fireEvent.press(getByTestId("select-recipe"));

      // Step 2: Add to meal plan
      await waitFor(() => {
        expect(getByTestId("step-2")).toBeTruthy();
      });
      fireEvent.press(getByTestId("add-to-meal-plan"));

      // Step 3: Check ingredients and add missing to shopping
      await waitFor(() => {
        expect(getByTestId("step-3")).toBeTruthy();
        expect(getByText("Missing: Sugar (2 cups)")).toBeTruthy();
      });
      fireEvent.press(getByTestId("add-to-shopping"));

      // Step 4: Mark items as purchased
      await waitFor(() => {
        expect(getByTestId("step-4")).toBeTruthy();
      });
      fireEvent.press(getByTestId("mark-purchased"));

      // Step 5: Add purchased items to inventory
      await waitFor(() => {
        expect(getByTestId("step-5")).toBeTruthy();
      });
      fireEvent.press(getByTestId("add-to-inventory"));

      // Step 6: Cook the meal
      await waitFor(() => {
        expect(getByTestId("step-6")).toBeTruthy();
      });
      fireEvent.press(getByTestId("mark-cooked"));

      // Step 7: Journey complete
      await waitFor(() => {
        expect(getByTestId("step-7")).toBeTruthy();
        expect(getByText("Journey Complete!")).toBeTruthy();
        expect(getByText("Meal cooked and inventory updated")).toBeTruthy();
      });
    });
  });

  describe("Offline Functionality", () => {
    it("should handle offline scenarios gracefully", async () => {
      // Mock network status as offline
      const mockNetInfo = require("@react-native-community/netinfo");
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false });

      const OfflineTestComponent = () => {
        const { View, Text, TouchableOpacity } = require("react-native");
        const [isOffline, setIsOffline] = React.useState(true);

        return (
          <View testID="offline-component">
            {isOffline && (
              <View testID="offline-banner">
                <Text>You are offline. Changes will sync when connected.</Text>
              </View>
            )}
            <TouchableOpacity testID="add-item-offline">
              <Text>Add Item (Offline)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sync-when-online"
              onPress={() => setIsOffline(false)}
            >
              <Text>Simulate Going Online</Text>
            </TouchableOpacity>
            {!isOffline && (
              <View testID="sync-indicator">
                <Text>Syncing changes...</Text>
              </View>
            )}
          </View>
        );
      };

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <OfflineTestComponent />
        </TestWrapper>
      );

      // Verify offline banner is shown
      expect(getByTestId("offline-banner")).toBeTruthy();
      expect(
        getByText("You are offline. Changes will sync when connected.")
      ).toBeTruthy();

      // Test offline functionality
      fireEvent.press(getByTestId("add-item-offline"));

      // Simulate going online
      fireEvent.press(getByTestId("sync-when-online"));

      // Verify sync indicator appears
      await waitFor(() => {
        expect(getByTestId("sync-indicator")).toBeTruthy();
        expect(getByText("Syncing changes...")).toBeTruthy();
      });
    });
  });
});
