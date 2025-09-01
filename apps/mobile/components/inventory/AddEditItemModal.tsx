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
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useInventory, InventoryItem } from "@/contexts/InventoryContext";

interface AddEditItemModalProps {
  visible: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
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
  "Other",
];

export function AddEditItemModal({
  visible,
  onClose,
  item,
}: AddEditItemModalProps) {
  const { addItem, updateItem } = useInventory();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [category, setCategory] = useState("Other");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (visible) {
      if (item) {
        // Edit mode
        setName(item.name);
        setQuantity(item.quantity.toString());
        setUnit(item.unit);
        setCategory(item.category);
        setExpiryDate(item.expiryDate ? new Date(item.expiryDate) : null);
      } else {
        // Add mode
        setName("");
        setQuantity("");
        setUnit("pieces");
        setCategory("Other");
        setExpiryDate(null);
      }
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter an item name");
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    setIsLoading(true);

    const itemData = {
      name: name.trim(),
      quantity: quantityNum,
      unit,
      category,
      expiryDate: expiryDate?.toISOString(),
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "No expiry date";
    return date.toLocaleDateString();
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
              <ThemedText style={styles.label}>Quantity *</ThemedText>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.section, styles.flex1, styles.marginLeft]}>
              <ThemedText style={styles.label}>Unit</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitSelector}
              >
                {COMMON_UNITS.map((unitOption) => (
                  <TouchableOpacity
                    key={unitOption}
                    style={[
                      styles.unitOption,
                      unit === unitOption && styles.unitOptionSelected,
                    ]}
                    onPress={() => setUnit(unitOption)}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        unit === unitOption && styles.unitOptionTextSelected,
                      ]}
                    >
                      {unitOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categorySelector}
            >
              {COMMON_CATEGORIES.map((categoryOption) => (
                <TouchableOpacity
                  key={categoryOption}
                  style={[
                    styles.categoryOption,
                    category === categoryOption &&
                      styles.categoryOptionSelected,
                  ]}
                  onPress={() => setCategory(categoryOption)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === categoryOption &&
                        styles.categoryOptionTextSelected,
                    ]}
                  >
                    {categoryOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Expiry Date (Optional)</ThemedText>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={styles.dateButtonText}>
                {formatDate(expiryDate)}
              </ThemedText>
            </TouchableOpacity>
            {expiryDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => setExpiryDate(null)}
              >
                <ThemedText style={styles.clearDateButtonText}>
                  Clear Date
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
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
  unitOptionSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  unitOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  unitOptionTextSelected: {
    color: "#3b82f6",
    fontWeight: "500",
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
  categoryOptionSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  categoryOptionTextSelected: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#374151",
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearDateButtonText: {
    fontSize: 14,
    color: "#ef4444",
  },
});
