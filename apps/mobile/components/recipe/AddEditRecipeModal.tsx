import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Recipe, useRecipe } from "@/contexts/RecipeContext";

interface Ingredient {
  quantity: number;
  unit: string;
  notes: string;
  inventoryItemId?: string;
}

interface AddEditRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
}

export function AddEditRecipeModal({
  visible,
  onClose,
  recipe,
}: AddEditRecipeModalProps) {
  const { createRecipe, updateRecipe, isLoading } = useRecipe();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { quantity: 1, unit: "", notes: "" },
  ]);

  const isEditing = !!recipe;

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setInstructions(recipe.instructions);
      setPrepTime(recipe.prepTime?.toString() || "");
      setCookTime(recipe.cookTime?.toString() || "");
      setServings(recipe.servings?.toString() || "");
      setTags(recipe.tags.join(", "));
      setIngredients(
        recipe.ingredients.map((ing) => ({
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || "",
          inventoryItemId: ing.inventoryItem?.id,
        }))
      );
    } else {
      resetForm();
    }
  }, [recipe, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setInstructions("");
    setPrepTime("");
    setCookTime("");
    setServings("");
    setTags("");
    setIngredients([{ quantity: 1, unit: "", notes: "" }]);
  };

  const handleClose = () => {
    if (!isEditing) {
      resetForm();
    }
    onClose();
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { quantity: 1, unit: "", notes: "" }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: any
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Recipe name is required");
      return false;
    }

    if (!instructions.trim()) {
      Alert.alert("Error", "Instructions are required");
      return false;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.unit.trim() && ing.quantity > 0
    );

    if (validIngredients.length === 0) {
      Alert.alert("Error", "At least one ingredient with unit is required");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const recipeData = {
      name: name.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim(),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
      ingredients: ingredients
        .filter((ing) => ing.unit.trim() && ing.quantity > 0)
        .map((ing) => ({
          quantity: ing.quantity,
          unit: ing.unit.trim(),
          notes: ing.notes.trim() || undefined,
          inventoryItemId: ing.inventoryItemId || undefined,
        })),
    };

    try {
      let result;
      if (isEditing && recipe) {
        result = await updateRecipe(recipe.id, recipeData);
      } else {
        result = await createRecipe(recipeData);
      }

      if (result.success) {
        handleClose();
        Alert.alert(
          "Success",
          `Recipe ${isEditing ? "updated" : "created"} successfully!`
        );
      } else {
        Alert.alert("Error", result.error || "Failed to save recipe");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to save recipe");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <ThemedText style={styles.title}>
              {isEditing ? "Edit Recipe" : "New Recipe"}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Info */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Basic Information
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Name *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter recipe name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief description of the recipe"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.label}>Prep Time (min)</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={prepTime}
                    onChangeText={setPrepTime}
                    placeholder="30"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.label}>Cook Time (min)</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={cookTime}
                    onChangeText={setCookTime}
                    placeholder="45"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <ThemedText style={styles.label}>Servings</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={servings}
                    onChangeText={setServings}
                    placeholder="4"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Tags</ThemedText>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="dinner, italian, pasta (comma separated)"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>
                  Ingredients *
                </ThemedText>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addIngredient}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <View style={styles.ingredientInputs}>
                    <TextInput
                      style={[styles.input, styles.quantityInput]}
                      value={ingredient.quantity.toString()}
                      onChangeText={(text) =>
                        updateIngredient(
                          index,
                          "quantity",
                          parseFloat(text) || 0
                        )
                      }
                      placeholder="1"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, styles.unitInput]}
                      value={ingredient.unit}
                      onChangeText={(text) =>
                        updateIngredient(index, "unit", text)
                      }
                      placeholder="cup, tbsp, etc."
                      placeholderTextColor="#9ca3af"
                    />
                    <TextInput
                      style={[styles.input, styles.notesInput]}
                      value={ingredient.notes}
                      onChangeText={(text) =>
                        updateIngredient(index, "notes", text)
                      }
                      placeholder="flour, diced onions, etc."
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {ingredients.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeIngredient(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Instructions *
              </ThemedText>
              <TextInput
                style={[styles.input, styles.instructionsInput]}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Step-by-step cooking instructions..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={8}
              />
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  instructionsInput: {
    height: 120,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  quantityInput: {
    width: 60,
  },
  unitInput: {
    width: 80,
  },
  notesInput: {
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
