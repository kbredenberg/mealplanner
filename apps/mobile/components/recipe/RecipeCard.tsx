import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Recipe } from "@/contexts/RecipeContext";

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  showActions?: boolean;
  currentUserId?: string;
}

export function RecipeCard({
  recipe,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
  currentUserId,
}: RecipeCardProps) {
  const isOwner = currentUserId === recipe.creator.id;
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  const handleDelete = () => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(recipe),
        },
      ]
    );
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <TouchableOpacity onPress={() => onPress(recipe)} activeOpacity={0.7}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.name} numberOfLines={2}>
              {recipe.name}
            </ThemedText>
            <ThemedText style={styles.creator}>
              by {recipe.creator.name}
            </ThemedText>
          </View>

          {showActions && isOwner && (
            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(recipe)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Description */}
        {recipe.description && (
          <ThemedText style={styles.description} numberOfLines={2}>
            {recipe.description}
          </ThemedText>
        )}

        {/* Recipe Info */}
        <View style={styles.info}>
          {recipe.servings && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Serves:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {recipe.servings}
              </ThemedText>
            </View>
          )}

          {totalTime > 0 && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Total:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatTime(totalTime)}
              </ThemedText>
            </View>
          )}

          {recipe.prepTime && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Prep:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatTime(recipe.prepTime)}
              </ThemedText>
            </View>
          )}

          {recipe.cookTime && (
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Cook:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatTime(recipe.cookTime)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Ingredients Count */}
        <View style={styles.ingredientsInfo}>
          <ThemedText style={styles.ingredientsCount}>
            {recipe.ingredients.length} ingredient
            {recipe.ingredients.length !== 1 ? "s" : ""}
          </ThemedText>
        </View>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <View style={styles.tags}>
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {recipe.tags.length > 3 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{recipe.tags.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  creator: {
    fontSize: 14,
    opacity: 0.7,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#ffffff",
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
    lineHeight: 20,
  },
  info: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  ingredientsInfo: {
    marginBottom: 8,
  },
  ingredientsCount: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: "italic",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  tagText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
});
