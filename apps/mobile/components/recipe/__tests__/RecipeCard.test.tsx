import React from "react";
import { render } from "@testing-library/react-native";
import { RecipeCard } from "../RecipeCard";
import { Recipe } from "@/contexts/RecipeContext";

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

const mockRecipe: Recipe = {
  id: "1",
  name: "Test Recipe",
  description: "A test recipe",
  instructions: "Test instructions",
  prepTime: 30,
  cookTime: 45,
  servings: 4,
  tags: ["dinner", "italian"],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  creator: {
    id: "user1",
    name: "Test User",
    email: "test@example.com",
  },
  ingredients: [
    {
      id: "1",
      quantity: 2,
      unit: "cups",
      notes: "flour",
    },
  ],
};

describe("RecipeCard", () => {
  it("renders recipe information correctly", () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <RecipeCard
        recipe={mockRecipe}
        onPress={mockOnPress}
        currentUserId="user1"
      />
    );

    expect(getByText("Test Recipe")).toBeTruthy();
    expect(getByText("by Test User")).toBeTruthy();
    expect(getByText("A test recipe")).toBeTruthy();
    expect(getByText("1 ingredient")).toBeTruthy();
  });
});
