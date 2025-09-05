import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { WeeklyMealPlan } from "../WeeklyMealPlan";
import type { MealPlan, MealPlanItem } from "@/contexts/MealPlanContext";

// Mock the themed components
jest.mock("@/components/ThemedText", () => {
  const { Text } = require("react-native");
  return {
    ThemedText: Text,
  };
});

jest.mock("@/components/ThemedView", () => {
  const { View } = require("react-native");
  return {
    ThemedView: View,
  };
});

// Mock MealSlot component
jest.mock("../MealSlot", () => ({
  MealSlot: ({ date, mealType, meal, onPress, onMarkCooked }: any) => {
    const { View, Text, TouchableOpacity } = require("react-native");
    return (
      <View testID={`meal-slot-${date}-${mealType}`}>
        <Text>{mealType}</Text>
        {meal && <Text>{meal.recipe?.name}</Text>}
        <TouchableOpacity
          testID={`add-meal-${date}-${mealType}`}
          onPress={() => onPress(date, mealType)}
        >
          <Text>Add Meal</Text>
        </TouchableOpacity>
        {meal && !meal.cooked && (
          <TouchableOpacity
            testID={`mark-cooked-${meal.id}`}
            onPress={() => onMarkCooked(meal)}
          >
            <Text>Mark Cooked</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

const mockMealPlan: MealPlan = {
  id: "meal-plan-1",
  weekStart: "2024-01-01",
  weekEnd: "2024-01-07",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  householdId: "household-1",
  meals: [
    {
      id: "meal-1",
      date: "2024-01-01",
      mealType: "DINNER",
      cooked: false,
      cookedAt: null,
      notes: null,
      mealPlanId: "meal-plan-1",
      recipeId: "recipe-1",
      recipe: {
        id: "recipe-1",
        name: "Pasta Bolognese",
        description: "Classic Italian pasta",
        instructions: "Cook pasta, make sauce",
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        tags: ["italian", "dinner"],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        creator: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
        ingredients: [],
      },
    },
    {
      id: "meal-2",
      date: "2024-01-02",
      mealType: "LUNCH",
      cooked: true,
      cookedAt: "2024-01-02T12:00:00Z",
      notes: null,
      mealPlanId: "meal-plan-1",
      recipeId: "recipe-2",
      recipe: {
        id: "recipe-2",
        name: "Caesar Salad",
        description: "Fresh caesar salad",
        instructions: "Mix ingredients",
        prepTime: 10,
        cookTime: 0,
        servings: 2,
        tags: ["salad", "lunch"],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        creator: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
        ingredients: [],
      },
    },
  ],
};

describe("WeeklyMealPlan", () => {
  it("renders meal plan correctly", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText, getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    // Check if week dates are displayed
    expect(getByText("Jan 1 - Jan 7, 2024")).toBeTruthy();

    // Check if meal slots are rendered
    expect(getByTestId("meal-slot-2024-01-01-BREAKFAST")).toBeTruthy();
    expect(getByTestId("meal-slot-2024-01-01-LUNCH")).toBeTruthy();
    expect(getByTestId("meal-slot-2024-01-01-DINNER")).toBeTruthy();

    // Check if meals are displayed
    expect(getByText("Pasta Bolognese")).toBeTruthy();
    expect(getByText("Caesar Salad")).toBeTruthy();
  });

  it("displays all days of the week", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    // Check if all days are displayed
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach((day) => {
      expect(getByText(day)).toBeTruthy();
    });
  });

  it("displays all meal types for each day", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    // Check if all meal types are displayed for first day
    expect(getByTestId("meal-slot-2024-01-01-BREAKFAST")).toBeTruthy();
    expect(getByTestId("meal-slot-2024-01-01-LUNCH")).toBeTruthy();
    expect(getByTestId("meal-slot-2024-01-01-DINNER")).toBeTruthy();
  });

  it("calls onAddMeal when add meal button is pressed", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    const addMealButton = getByTestId("add-meal-2024-01-01-BREAKFAST");
    fireEvent.press(addMealButton);

    expect(mockOnAddMeal).toHaveBeenCalledWith("2024-01-01", "BREAKFAST");
  });

  it("calls onMarkCooked when mark cooked button is pressed", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    const markCookedButton = getByTestId("mark-cooked-meal-1");
    fireEvent.press(markCookedButton);

    expect(mockOnMarkCooked).toHaveBeenCalledWith(mockMealPlan.meals[0]);
  });

  it("shows empty state when no meal plan is provided", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText } = render(
      <WeeklyMealPlan
        mealPlan={null}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    expect(getByText("No meal plan for this week")).toBeTruthy();
    expect(getByText("Create a meal plan to get started")).toBeTruthy();
  });

  it("handles navigation to previous week", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();
    const mockOnWeekChange = jest.fn();

    const { getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
        onWeekChange={mockOnWeekChange}
      />
    );

    const prevWeekButton = getByTestId("prev-week-button");
    fireEvent.press(prevWeekButton);

    expect(mockOnWeekChange).toHaveBeenCalledWith("prev");
  });

  it("handles navigation to next week", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();
    const mockOnWeekChange = jest.fn();

    const { getByTestId } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
        onWeekChange={mockOnWeekChange}
      />
    );

    const nextWeekButton = getByTestId("next-week-button");
    fireEvent.press(nextWeekButton);

    expect(mockOnWeekChange).toHaveBeenCalledWith("next");
  });

  it("shows ingredient availability warnings", () => {
    const mealPlanWithWarnings = {
      ...mockMealPlan,
      meals: [
        {
          ...mockMealPlan.meals[0],
          ingredientAvailability: {
            allAvailable: false,
            missingIngredients: ["tomatoes", "basil"],
          },
        },
      ],
    };

    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText } = render(
      <WeeklyMealPlan
        mealPlan={mealPlanWithWarnings}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
      />
    );

    expect(getByText("Missing ingredients")).toBeTruthy();
  });

  it("shows loading state", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText } = render(
      <WeeklyMealPlan
        mealPlan={mockMealPlan}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
        isLoading={true}
      />
    );

    expect(getByText("Loading meal plan...")).toBeTruthy();
  });

  it("shows error state", () => {
    const mockOnAddMeal = jest.fn();
    const mockOnEditMeal = jest.fn();
    const mockOnMarkCooked = jest.fn();

    const { getByText } = render(
      <WeeklyMealPlan
        mealPlan={null}
        onAddMeal={mockOnAddMeal}
        onEditMeal={mockOnEditMeal}
        onMarkCooked={mockOnMarkCooked}
        error="Failed to load meal plan"
      />
    );

    expect(getByText("Failed to load meal plan")).toBeTruthy();
  });
});
