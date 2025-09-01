import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import {
  useShoppingList,
  ShoppingListItem,
} from "@/contexts/ShoppingListContext";

interface AddEditShoppingItemModalProps {
  visible: boolean;
  onClose: () => void;
  item?: ShoppingListItem | null;
}

const COMMON_UNITS = [
  "pieces",
  "kg",
  "g",
  "lbs",
  "oz",
  "liters",
  "ml",
  "cups",
  "tbsp",
  "tsp",
  "cans",
  "bottles",
  "packages",
  "boxes",
];

const COMMON_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Meat & Poultry",
  "Seafood",
  "Dairy",
  "Grains & Cereals",
  "Pantry",
  "Spices & Herbs",
  "Beverages",
  "Snacks",
  "Frozen",
  "Condiments",
  "Baking",
  "Household",
  "Personal Care",
  "Other",
];

export function AddEditShoppingItemModal({
  visible,
  onClose,
  item,
}: AddEditShoppingItemModalProps) {
  const { addItem, updateItem } = useShoppingList();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (visible) {
      if (item) {
        // Edit mode
        setName(item.name);
        setQuantity(item.quantity?.toString() || "");
        setUnit(item.unit || "");
        setCategory(item.category || "");
      } else {
        // Add mode
        setName("");
        setQuantity("");
        setUnit("");
        setCategory("");
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter an item name");
      return;
    }

    const quantityNum = quantity.trim() ? parseFloat(quantity) : undefined;
    if (quantity.trim() && (isNaN(quantityNum!) || quantityNum! <= 0)) {
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    setIsLoading(true);

    const itemData = {
      name: name.trim(),
      quantity: quantityNum,
      unit: unit.trim() || undefined,
      category: category.trim() || undefined,
    };

    try {
      let result;
      if (item) {
        // Update existing item
        result = await updateItem(item.id, itemData);
      } else {
        // Add new item
        result = await addItem(itemData);
      }

      if (result.success) {
        onClose();
      } else {
        Alert.alert("Error", result.error || "Failed to save item");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.title}>
            {item ? "Edit Item" : "Add Item"}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <ThemedText
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
            >
              {isLoading ? "Saving..." : "Save"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <ThemedText style={styles.label}>Item Name *</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter item name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.flex1]}>
              <ThemedText style={styles.label}>Quantity</ThemedText>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Optional"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.section, styles.flex1, styles.marginLeft]}>
              <ThemedText style={styles.label}>Unit</ThemedText>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="Optional"
                autoCapitalize="none"
              />
            </View>
          </View>

          {unit === "" && (
            <View style={styles.section}>
              <ThemedText style={styles.label}>Common Units</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitSelector}
              >
                {COMMON_UNITS.map((unitOption) => (
                  <TouchableOpacity
                    key={unitOption}
                    style={styles.unitOption}
                    onPress={() => setUnit(unitOption)}
                  >
                    <Text style={styles.unitOptionText}>{unitOption}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Optional"
              autoCapitalize="words"
            />
          </View>

          {category === "" && (
            <View style={styles.section}>
              <ThemedText style={styles.label}>Common Categories</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelector}
              >
                {COMMON_CATEGORIES.map((categoryOption) => (
                  <TouchableOpacity
                    key={categoryOption}
                    style={styles.categoryOption}
                    onPress={() => setCategory(categoryOption)}
                  >
                    <Text style={styles.categoryOptionText}>
                      {categoryOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    fontSize: 16,
    color: "#6b7280",
  },
  saveButton: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  unitSelector: {
    maxHeight: 50,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  unitOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  categorySelector: {
    maxHeight: 50,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#374151",
  },
});
