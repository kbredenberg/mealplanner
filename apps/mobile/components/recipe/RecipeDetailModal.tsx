import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Recipe } from "@/contexts/RecipeContext";

interface RecipeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onEdit?: (recipe: Recipe) => void;
  currentUserId?: string;
}

export function RecipeDetailModal({
  visible,
  onClose,
  recipe,
  onEdit,
  currentUserId,
}: RecipeDetailModalProps) {
  if (!recipe) return null;

  const isOwner = currentUserId === recipe.creator.id;
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minutes`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  const formatInstructions = (instructions: string) => {
    // Split by common step indicators and clean up
    const steps = instructions
      .split(/\n+|\d+\.\s*/)
      .map((step) => step.trim())
      .filter((step) => step.length > 0);

    return steps;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <ThemedText style={styles.title} numberOfLines={1}>
            {recipe.name}
          </ThemedText>
          {isOwner && onEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(recipe)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recipe Info */}
          <View style={styles.section}>
            <View style={styles.recipeHeader}>
              <ThemedText style={styles.recipeName}>{recipe.name}</ThemedText>
              <ThemedText style={styles.creator}>
                by {recipe.creator.name}
              </ThemedText>
            </View>

            {recipe.description && (
              <ThemedText style={styles.description}>
                {recipe.description}
              </ThemedText>
            )}

            {/* Time and Servings Info */}
            <View style={styles.infoGrid}>
              {recipe.servings && (
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Servings</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {recipe.servings}
                  </ThemedText>
                </View>
              )}

              {totalTime > 0 && (
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Total Time</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {formatTime(totalTime)}
                  </ThemedText>
                </View>
              )}

              {recipe.prepTime && (
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Prep Time</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {formatTime(recipe.prepTime)}
                  </ThemedText>
                </View>
              )}

              {recipe.cookTime && (
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Cook Time</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {formatTime(recipe.cookTime)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <ThemedText style={styles.tagsLabel}>Tags:</ThemedText>
                <View style={styles.tags}>
                  {recipe.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Ingredients ({recipe.ingredients.length})
            </ThemedText>
            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientQuantity}>
                    <ThemedText style={styles.ingredientQuantityText}>
                      {ingredient.quantity} {ingredient.unit}
                    </ThemedText>
                  </View>
                  <View style={styles.ingredientDetails}>
                    <ThemedText style={styles.ingredientName}>
                      {ingredient.inventoryItem?.name ||
                        ingredient.notes ||
                        "Ingredient"}
                    </ThemedText>
                    {ingredient.notes && ingredient.inventoryItem && (
                      <ThemedText style={styles.ingredientNotes}>
                        {ingredient.notes}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
            <View style={styles.instructionsList}>
              {formatInstructions(recipe.instructions).map((step, index) => (
                <View key={index} style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <ThemedText style={styles.stepText}>{step}</ThemedText>
                </View>
              ))}
            </View>
          </View>
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: "#6b7280",
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  editButtonText: {
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
  recipeHeader: {
    marginBottom: 16,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  creator: {
    fontSize: 16,
    opacity: 0.7,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    opacity: 0.8,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 20,
  },
  infoItem: {
    minWidth: 120,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  tagText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ingredientQuantity: {
    minWidth: 80,
    marginRight: 16,
  },
  ingredientQuantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  ingredientDetails: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  ingredientNotes: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
  instructionsList: {
    gap: 16,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 2,
  },
});
