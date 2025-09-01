import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useInventory, InventoryItem } from "@/contexts/InventoryContext";

interface InventoryItemCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
}

export function InventoryItemCard({ item, onEdit }: InventoryItemCardProps) {
  const { updateItem, deleteItem } = useInventory();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState("");

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Expired", color: "#ef4444" };
    } else if (diffDays === 0) {
      return { text: "Expires today", color: "#f59e0b" };
    } else if (diffDays <= 3) {
      return {
        text: `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
        color: "#f59e0b",
      };
    } else if (diffDays <= 7) {
      return { text: `Expires in ${diffDays} days`, color: "#10b981" };
    }
    return null;
  };

  const handleQuantityAdjustment = async (type: "add" | "subtract") => {
    const value = parseFloat(adjustmentValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Invalid Value", "Please enter a valid positive number");
      return;
    }

    const newQuantity =
      type === "add" ? item.quantity + value : item.quantity - value;

    if (newQuantity < 0) {
      Alert.alert("Invalid Quantity", "Quantity cannot be negative");
      return;
    }

    const result = await updateItem(item.id, { quantity: newQuantity });
    if (result.success) {
      setIsAdjusting(false);
      setAdjustmentValue("");
    } else {
      Alert.alert("Error", result.error || "Failed to update quantity");
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

  const expiryInfo = formatExpiryDate(item.expiryDate);

  return (
    <ThemedView style={styles.card}>
      <View style={styles.header}>
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          <ThemedText style={styles.category}>{item.category}</ThemedText>
          {expiryInfo && (
            <Text style={[styles.expiry, { color: expiryInfo.color }]}>
              {expiryInfo.text}
            </Text>
          )}
        </View>
        <View style={styles.quantityContainer}>
          <ThemedText style={styles.quantity}>
            {item.quantity} {item.unit}
          </ThemedText>
        </View>
      </View>

      {isAdjusting ? (
        <View style={styles.adjustmentContainer}>
          <TextInput
            style={styles.adjustmentInput}
            value={adjustmentValue}
            onChangeText={setAdjustmentValue}
            placeholder="Enter amount"
            keyboardType="numeric"
            autoFocus
          />
          <View style={styles.adjustmentButtons}>
            <TouchableOpacity
              style={[styles.adjustmentButton, styles.addButton]}
              onPress={() => handleQuantityAdjustment("add")}
            >
              <Text style={styles.adjustmentButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adjustmentButton, styles.subtractButton]}
              onPress={() => handleQuantityAdjustment("subtract")}
            >
              <Text style={styles.adjustmentButtonText}>Use</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adjustmentButton, styles.cancelButton]}
              onPress={() => {
                setIsAdjusting(false);
                setAdjustmentValue("");
              }}
            >
              <Text style={styles.adjustmentButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsAdjusting(true)}
          >
            <ThemedText style={styles.actionButtonText}>Adjust Qty</ThemedText>
          </TouchableOpacity>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  expiry: {
    fontSize: 12,
    fontWeight: "500",
  },
  quantityContainer: {
    alignItems: "flex-end",
  },
  quantity: {
    fontSize: 16,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#dc2626",
  },
  adjustmentContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  adjustmentInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  adjustmentButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  adjustmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#dcfce7",
  },
  subtractButton: {
    backgroundColor: "#fef3c7",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  adjustmentButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
});
