import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMealPlan, MealAvailability } from "@/contexts/MealPlanContext";
import { useShoppingList } from "@/contexts/ShoppingListContext";

interface IngredientAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
}

export function IngredientAvailabilityModal({
  visible,
  onClose,
}: IngredientAvailabilityModalProps) {
  const { checkWeekAvailability } = useMealPlan();
  const { addItem: addToShoppingList } = useShoppingList();

  const [availabilityData, setAvailabilityData] = useState<MealAvailability[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [addingToShoppingList, setAddingToShoppingList] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (visible) {
      loadAvailabilityData();
    }
  }, [visible]);

  const loadAvailabilityData = async () => {
    setIsLoading(true);
    try {
      const data = await checkWeekAvailability();
      setAvailabilityData(data);
    } catch (error) {
      console.error("Error loading availability data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToShoppingList = async (
    ingredientName: string,
    quantity: number,
    unit: string
  ) => {
    const key = `${ingredientName}-${quantity}-${unit}`;
    setAddingToShoppingList((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await addToShoppingList({
        name: ingredientName,
        quantity,
        unit,
        category: "Ingredients", // Default category
      });

      if (result.success) {
        Alert.alert("Success", `Added ${ingredientName} to shopping list`);
      } else {
        Alert.alert("Error", result.error || "Failed to add to shopping list");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add to shopping list");
    } finally {
      setAddingToShoppingList((prev) => ({ ...prev, [key]: false }));
    }
  };

  const renderAvailabilityItem = ({
    item: meal,
  }: {
    item: MealAvailability;
  }) => {
    return (
      <View style={styles.mealItem}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealName}>{meal.recipeName}</Text>
          <View
            style={[
              styles.statusIndicator,
              meal.canCook ? styles.availableStatus : styles.unavailableStatus,
            ]}
          >
            <Text style={styles.statusText}>
              {meal.canCook ? "Ready to Cook" : "Missing Ingredients"}
            </Text>
          </View>
        </View>

        {!meal.canCook && meal.missingIngredients.length > 0 && (
          <View style={styles.missingIngredientsContainer}>
            <Text style={styles.missingIngredientsTitle}>
              Missing Ingredients:
            </Text>
            {meal.missingIngredients.map((ingredient, index) => {
              const missingAmount = ingredient.required - ingredient.available;
              const key = `${ingredient.ingredientName}-${missingAmount}-${ingredient.unit}`;
              const isAdding = addingToShoppingList[key];

              return (
                <View key={index} style={styles.missingIngredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>
                      {ingredient.ingredientName}
                    </Text>
                    <Text style={styles.ingredientAmount}>
                      Need: {ingredient.required} {ingredient.unit}
                    </Text>
                    <Text style={styles.ingredientAvailable}>
                      Have: {ingredient.available} {ingredient.unit}
                    </Text>
                    <Text style={styles.ingredientMissing}>
                      Missing: {missingAmount} {ingredient.unit}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addToShoppingButton,
                      isAdding && styles.disabledButton,
                    ]}
                    onPress={() =>
                      handleAddToShoppingList(
                        ingredient.ingredientName,
                        missingAmount,
                        ingredient.unit
                      )
                    }
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addToShoppingButtonText}>
                        Add to List
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {meal.canCook && (
          <View style={styles.readyToCookContainer}>
            <Text style={styles.readyToCookText}>
              ✓ All ingredients available
            </Text>
          </View>
        )}
      </View>
    );
  };

  const availableMeals = availabilityData.filter((meal) => meal.canCook);
  const unavailableMeals = availabilityData.filter((meal) => !meal.canCook);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ingredient Availability</Text>
          <TouchableOpacity onPress={loadAvailabilityData}>
            <Text style={styles.refreshButton}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>
              Checking ingredient availability...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {availableMeals.length}
                </Text>
                <Text style={styles.summaryLabel}>Ready to Cook</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, styles.warningNumber]}>
                  {unavailableMeals.length}
                </Text>
                <Text style={styles.summaryLabel}>Missing Ingredients</Text>
              </View>
            </View>

            <FlatList
              data={availabilityData}
              renderItem={renderAvailabilityItem}
              keyExtractor={(item) => item.recipeId}
              style={styles.availabilityList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No meals planned for this week
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  closeButton: {
    fontSize: 16,
    color: "#3498db",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  refreshButton: {
    fontSize: 16,
    color: "#3498db",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  warningNumber: {
    color: "#e74c3c",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  availabilityList: {
    flex: 1,
  },
  mealItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availableStatus: {
    backgroundColor: "#d4edda",
  },
  unavailableStatus: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  missingIngredientsContainer: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  missingIngredientsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
  },
  missingIngredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ffeaa7",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  ingredientAmount: {
    fontSize: 12,
    color: "#666",
  },
  ingredientAvailable: {
    fontSize: 12,
    color: "#2ecc71",
  },
  ingredientMissing: {
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "600",
  },
  addToShoppingButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },
  disabledButton: {
    backgroundColor: "#bbb",
  },
  addToShoppingButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  readyToCookContainer: {
    backgroundColor: "#d4edda",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  readyToCookText: {
    fontSize: 14,
    color: "#155724",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
