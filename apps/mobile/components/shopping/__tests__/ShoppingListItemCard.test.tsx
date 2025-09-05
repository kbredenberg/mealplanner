import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ShoppingListItemCard } from "../ShoppingListItemCard";
import type { ShoppingListItem } from "@/contexts/ShoppingListContext";

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

const mockShoppingItem: ShoppingListItem = {
  id: "1",
  name: "Milk",
  quantity: 2,
  unit: "liters",
  category: "Dairy",
  completed: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  householdId: "household-1",
};

const mockCompletedItem: ShoppingListItem = {
  ...mockShoppingItem,
  completed: true,
};

const mockItemNoQuantity: ShoppingListItem = {
  ...mockShoppingItem,
  quantity: null,
  unit: null,
};

describe("ShoppingListItemCard", () => {
  it("renders shopping item information correctly", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    expect(getByText("Milk")).toBeTruthy();
    expect(getByText("2 liters")).toBeTruthy();
    expect(getByText("Dairy")).toBeTruthy();
  });

  it("renders item without quantity and unit", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByText, queryByText } = render(
      <ShoppingListItemCard
        item={mockItemNoQuantity}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    expect(getByText("Milk")).toBeTruthy();
    expect(queryByText(/liters/)).toBeNull();
  });

  it("shows completed state correctly", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockCompletedItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const checkbox = getByTestId("shopping-item-checkbox");
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it("shows uncompleted state correctly", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const checkbox = getByTestId("shopping-item-checkbox");
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it("calls onToggleComplete when checkbox is pressed", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const checkbox = getByTestId("shopping-item-checkbox");
    fireEvent.press(checkbox);

    expect(mockOnToggleComplete).toHaveBeenCalledWith(
      mockShoppingItem.id,
      true
    );
  });

  it("calls onToggleComplete with false when completed item is unchecked", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockCompletedItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const checkbox = getByTestId("shopping-item-checkbox");
    fireEvent.press(checkbox);

    expect(mockOnToggleComplete).toHaveBeenCalledWith(
      mockCompletedItem.id,
      false
    );
  });

  it("calls onPress when card is pressed", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const card = getByTestId("shopping-item-card");
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith(mockShoppingItem);
  });

  it("applies completed styling to completed items", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockCompletedItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const card = getByTestId("shopping-item-card");
    expect(card.props.style).toEqual(
      expect.objectContaining({
        opacity: expect.any(Number), // Should have reduced opacity
      })
    );
  });

  it("shows edit and delete buttons when showActions is true", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
        showActions={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = getByTestId("edit-shopping-item");
    const deleteButton = getByTestId("delete-shopping-item");

    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();

    fireEvent.press(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockShoppingItem);

    fireEvent.press(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockShoppingItem);
  });

  it("shows add to inventory button when item is completed", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();
    const mockOnAddToInventory = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockCompletedItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
        onAddToInventory={mockOnAddToInventory}
      />
    );

    const addToInventoryButton = getByTestId("add-to-inventory");
    expect(addToInventoryButton).toBeTruthy();

    fireEvent.press(addToInventoryButton);
    expect(mockOnAddToInventory).toHaveBeenCalledWith(mockCompletedItem);
  });

  it("does not show add to inventory button for uncompleted items", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();
    const mockOnAddToInventory = jest.fn();

    const { queryByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
        onAddToInventory={mockOnAddToInventory}
      />
    );

    const addToInventoryButton = queryByTestId("add-to-inventory");
    expect(addToInventoryButton).toBeNull();
  });

  it("shows priority indicator for high priority items", () => {
    const highPriorityItem = { ...mockShoppingItem, priority: "high" };
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={highPriorityItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
      />
    );

    const priorityIndicator = getByTestId("priority-indicator");
    expect(priorityIndicator).toBeTruthy();
  });

  it("shows sync status indicator when syncing", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
        isSyncing={true}
      />
    );

    const syncIndicator = getByTestId("sync-indicator");
    expect(syncIndicator).toBeTruthy();
  });

  it("shows offline indicator when offline", () => {
    const mockOnToggleComplete = jest.fn();
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <ShoppingListItemCard
        item={mockShoppingItem}
        onToggleComplete={mockOnToggleComplete}
        onPress={mockOnPress}
        isOffline={true}
      />
    );

    const offlineIndicator = getByTestId("offline-indicator");
    expect(offlineIndicator).toBeTruthy();
  });
});
