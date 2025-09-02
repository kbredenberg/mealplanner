import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRecipe } from "@/contexts/RecipeContext";
import { useMealPlan, MealAvailability } from "@/contexts/MealPlanContext";

interface RecipePickerModalProps {
  visible: boolean;
  date: string;
  mealType: string;
  onClose: () => void;
}

export function RecipePickerModal({
  visible,
  date,
  mealType,
  onClose,
}: RecipePickerModalProps) {
  const {
    recipes,
    isLoading: recipesLoading,
    getFilteredRecipes,
  } = useRecipe();
  const { addMealToSlot, checkIngredientAvailability } = useMealPlan();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredRecipes, setFilteredRecipes] = useState(recipes);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<
    Record<string, MealAvailability>
  >({});
  const [checkingAvailability, setCheckingAvailability] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (visible) {
      filterRecipes();
      checkRecipeAvailability();
    }
  }, [visible, searchQuery, recipes]);

  const filterRecipes = () => {
    let filtered = recipes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = recipes.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredRecipes(filtered);
  };

  const checkRecipeAvailability = async () => {
    const recipesToCheck = filteredRecipes.slice(0, 10); // Check first 10 for performance

    for (const recipe of recipesToCheck) {
      if (!availabilityData[recipe.id] && !checkingAvailability[recipe.id]) {
        setCheckingAvailability((prev) => ({ ...prev, [recipe.id]: true }));

        const availability = await checkIngredientAvailability(recipe.id);
        if (availability) {
          setAvailabilityData((prev) => ({
            ...prev,
            [recipe.id]: availability,
          }));
        }

        setCheckingAvailability((prev) => ({ ...prev, [recipe.id]: false }));
      }
    }
  };

  const handleAddMeal = async () => {
    if (!selectedRecipeId) {
      Alert.alert("Error", "Please select a recipe");
      return;
    }

    setIsAdding(true);

    const result = await addMealToSlot({
      date,
      mealType: mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      recipeId: selectedRecipeId,
      notes: notes.trim() || undefined,
    });

    setIsAdding(false);

    if (result.success) {
      onClose();
      setSelectedRecipeId(null);
      setNotes("");
      setSearchQuery("");
    } else {
      Alert.alert("Error", result.error || "Failed to add meal");
    }
  };

  const renderRecipeItem = ({ item: recipe }: { item: any }) => {
    const availability = availabilityData[recipe.id];
    const isChecking = checkingAvailability[recipe.id];
    const isSelected = selectedRecipeId === recipe.id;

    return (
      <TouchableOpacity
        style={[styles.recipeItem, isSelected && styles.selectedRecipeItem]}
        onPress={() => setSelectedRecipeId(recipe.id)}
      >
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          {isChecking ? (
            <ActivityIndicator size="small" color="#666" />
          ) : availability ? (
            <View
              style={[
                styles.availabilityIndicator,
                availability.canCook
                  ? styles.availableIndicator
                  : styles.unavailableIndicator,
              ]}
            >
              <Text style={styles.availabilityText}>
                {availability.canCook ? "✓" : "!"}
              </Text>
            </View>
          ) : null}
        </View>

        {recipe.description && (
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        <View style={styles.recipeDetails}>
          <Text style={styles.recipeTime}>
            {recipe.prepTime ? `${recipe.prepTime}min prep` : ""}
            {recipe.prepTime && recipe.cookTime ? " • " : ""}
            {recipe.cookTime ? `${recipe.cookTime}min cook` : ""}
          </Text>
          {recipe.servings && (
            <Text style={styles.recipeServings}>Serves {recipe.servings}</Text>
          )}
        </View>

        {availability && !availability.canCook && (
          <View style={styles.missingIngredients}>
            <Text style={styles.missingIngredientsTitle}>Missing:</Text>
            {availability.missingIngredients
              .slice(0, 3)
              .map((ingredient, index) => (
                <Text key={index} style={styles.missingIngredient}>
                  {ingredient.ingredientName} (
                  {ingredient.required - ingredient.available} {ingredient.unit}
                  )
                </Text>
              ))}
            {availability.missingIngredients.length > 3 && (
              <Text style={styles.moreIngredients}>
                +{availability.missingIngredients.length - 3} more
              </Text>
            )}
          </View>
        )}

        {recipe.tags.length > 0 && (
          <View style={styles.recipeTags}>
            {recipe.tags.slice(0, 3).map((tag: string) => (
              <View key={tag} style={styles.recipeTag}>
                <Text style={styles.recipeTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            Select Recipe for {mealType.toLowerCase()} on{" "}
            {new Date(date).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            onPress={handleAddMeal}
            disabled={!selectedRecipeId || isAdding}
            style={[
              styles.addButton,
              (!selectedRecipeId || isAdding) && styles.disabledButton,
            ]}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {selectedRecipeId && (
          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {recipesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading recipes...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
            style={styles.recipeList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? "No recipes found" : "No recipes available"}
                </Text>
              </View>
            }
          />
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
  cancelButton: {
    fontSize: 16,
    color: "#3498db",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  addButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#bbb",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  notesInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    textAlignVertical: "top",
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
  recipeList: {
    flex: 1,
  },
  recipeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  selectedRecipeItem: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  availabilityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  availableIndicator: {
    backgroundColor: "#4caf50",
  },
  unavailableIndicator: {
    backgroundColor: "#f44336",
  },
  availabilityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  recipeDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recipeTime: {
    fontSize: 12,
    color: "#666",
  },
  recipeServings: {
    fontSize: 12,
    color: "#666",
  },
  missingIngredients: {
    backgroundColor: "#ffebee",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  missingIngredientsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d32f2f",
    marginBottom: 4,
  },
  missingIngredient: {
    fontSize: 11,
    color: "#d32f2f",
  },
  moreIngredients: {
    fontSize: 11,
    color: "#d32f2f",
    fontStyle: "italic",
  },
  recipeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  recipeTag: {
    backgroundColor: "#e1e8ed",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  recipeTagText: {
    fontSize: 11,
    color: "#666",
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
