import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { InventoryItemCard } from "../InventoryItemCard";
import type { InventoryItem } from "@/contexts/InventoryContext";

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

const mockInventoryItem: InventoryItem = {
  id: "1",
  name: "Apples",
  quantity: 5,
  unit: "pieces",
  category: "Fruits",
  expiryDate: "2024-12-31",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  householdId: "household-1",
};

const mockInventoryItemNoExpiry: InventoryItem = {
  ...mockInventoryItem,
  expiryDate: null,
};

const mockInventoryItemExpired: InventoryItem = {
  ...mockInventoryItem,
  expiryDate: "2023-12-31", // Past date
};

describe("InventoryItemCard", () => {
  it("renders inventory item information correctly", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByText } = render(
      <InventoryItemCard
        item={mockInventoryItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    expect(getByText("Apples")).toBeTruthy();
    expect(getByText("5 pieces")).toBeTruthy();
    expect(getByText("Fruits")).toBeTruthy();
    expect(getByText("Expires: Dec 31, 2024")).toBeTruthy();
  });

  it("renders item without expiry date", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByText, queryByText } = render(
      <InventoryItemCard
        item={mockInventoryItemNoExpiry}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    expect(getByText("Apples")).toBeTruthy();
    expect(queryByText(/Expires:/)).toBeNull();
  });

  it("shows expired status for past expiry date", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByText } = render(
      <InventoryItemCard
        item={mockInventoryItemExpired}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    expect(getByText("Expired")).toBeTruthy();
  });

  it("shows low stock warning for zero quantity", () => {
    const lowStockItem = { ...mockInventoryItem, quantity: 0 };
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByText } = render(
      <InventoryItemCard
        item={lowStockItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    expect(getByText("Out of stock")).toBeTruthy();
  });

  it("calls onPress when card is pressed", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByText } = render(
      <InventoryItemCard
        item={mockInventoryItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    fireEvent.press(getByText("Apples"));
    expect(mockOnPress).toHaveBeenCalledWith(mockInventoryItem);
  });

  it("calls onQuantityChange when quantity buttons are pressed", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByTestId } = render(
      <InventoryItemCard
        item={mockInventoryItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
        showQuantityControls={true}
      />
    );

    const increaseButton = getByTestId("increase-quantity");
    const decreaseButton = getByTestId("decrease-quantity");

    fireEvent.press(increaseButton);
    expect(mockOnQuantityChange).toHaveBeenCalledWith(mockInventoryItem.id, 6);

    fireEvent.press(decreaseButton);
    expect(mockOnQuantityChange).toHaveBeenCalledWith(mockInventoryItem.id, 4);
  });

  it("prevents quantity from going below zero", () => {
    const zeroQuantityItem = { ...mockInventoryItem, quantity: 0 };
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByTestId } = render(
      <InventoryItemCard
        item={zeroQuantityItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
        showQuantityControls={true}
      />
    );

    const decreaseButton = getByTestId("decrease-quantity");
    fireEvent.press(decreaseButton);

    expect(mockOnQuantityChange).not.toHaveBeenCalled();
  });

  it("shows edit and delete buttons when showActions is true", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    const { getByTestId } = render(
      <InventoryItemCard
        item={mockInventoryItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
        showActions={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = getByTestId("edit-item");
    const deleteButton = getByTestId("delete-item");

    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();

    fireEvent.press(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockInventoryItem);

    fireEvent.press(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockInventoryItem);
  });

  it("applies correct styling for expired items", () => {
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByTestId } = render(
      <InventoryItemCard
        item={mockInventoryItemExpired}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    const card = getByTestId("inventory-item-card");
    expect(card.props.style).toEqual(
      expect.objectContaining({
        borderColor: expect.any(String), // Should have warning border
      })
    );
  });

  it("applies correct styling for low stock items", () => {
    const lowStockItem = { ...mockInventoryItem, quantity: 0 };
    const mockOnPress = jest.fn();
    const mockOnQuantityChange = jest.fn();

    const { getByTestId } = render(
      <InventoryItemCard
        item={lowStockItem}
        onPress={mockOnPress}
        onQuantityChange={mockOnQuantityChange}
      />
    );

    const card = getByTestId("inventory-item-card");
    expect(card.props.style).toEqual(
      expect.objectContaining({
        opacity: expect.any(Number), // Should have reduced opacity
      })
    );
  });
});
