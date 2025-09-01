import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import {
  useShoppingList,
  ShoppingListItem,
} from "@/contexts/ShoppingListContext";

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onEdit: (item: ShoppingListItem) => void;
  isSelected?: boolean;
  onSelect?: (item: ShoppingListItem) => void;
  selectionMode?: boolean;
}

export function ShoppingListItemCard({
  item,
  onEdit,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: ShoppingListItemCardProps) {
  const { toggleItem, deleteItem } = useShoppingList();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;

    setIsToggling(true);
    const result = await toggleItem(item.id);
    setIsToggling(false);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to update item");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteItem(item.id);
            if (!result.success) {
              Alert.alert("Error", result.error || "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handlePress = () => {
    if (selectionMode && onSelect) {
      onSelect(item);
    } else {
      handleToggle();
    }
  };

  const formatQuantity = () => {
    if (!item.quantity) return "";
    return item.unit ? `${item.quantity} ${item.unit}` : `${item.quantity}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        item.completed && styles.completedCard,
        isSelected && styles.selectedCard,
      ]}
      onPress={handlePress}
      disabled={isToggling}
    >
      <ThemedView style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                item.completed && styles.checkboxCompleted,
                isSelected && styles.checkboxSelected,
              ]}
              onPress={
                selectionMode && onSelect ? () => onSelect(item) : handleToggle
              }
              disabled={isToggling}
            >
              {item.completed && !selectionMode && (
                <Text style={styles.checkmark}>✓</Text>
              )}
              {isSelected && selectionMode && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.itemInfo}>
            <ThemedText
              style={[styles.itemName, item.completed && styles.completedText]}
            >
              {item.name}
            </ThemedText>

            <View style={styles.itemDetails}>
              {item.category && (
                <ThemedText style={styles.category}>{item.category}</ThemedText>
              )}
              {formatQuantity() && (
                <ThemedText style={styles.quantity}>
                  {formatQuantity()}
                </ThemedText>
              )}
            </View>
          </View>

          {!selectionMode && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit(item)}
              >
                <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <ThemedText
                  style={[styles.actionButtonText, styles.deleteButtonText]}
                >
                  Delete
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.7,
    backgroundColor: "#f9fafb",
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  cardContent: {
    padding: 16,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkboxSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  category: {
    fontSize: 14,
    opacity: 0.7,
    marginRight: 12,
  },
  quantity: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#dc2626",
  },
});
