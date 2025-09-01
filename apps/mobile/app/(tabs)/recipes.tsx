import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRecipe, Recipe } from "@/contexts/RecipeContext";
import { useAuth } from "@/contexts/AuthContext";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { RecipeFilters } from "@/components/recipe/RecipeFilters";
import { AddEditRecipeModal } from "@/components/recipe/AddEditRecipeModal";
import { RecipeDetailModal } from "@/components/recipe/RecipeDetailModal";

export default function RecipesScreen() {
  const { user } = useAuth();
  const {
    getFilteredRecipes,
    isLoading,
    error,
    loadRecipes,
    deleteRecipe,
    searchQuery,
    selectedTags,
  } = useRecipe();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = getFilteredRecipes();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleRefresh = async () => {
    await loadRecipes();
  };

  const handleRecipePress = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    const result = await deleteRecipe(recipe.id);
    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to delete recipe");
    }
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
    setSelectedRecipe(null);
  };

  const handleEditFromDetail = (recipe: Recipe) => {
    setSelectedRecipe(null);
    setEditingRecipe(recipe);
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const renderEmptyState = () => {
    if (isLoading) return null;

    const hasFilters = searchQuery.trim() || selectedTags.length > 0;

    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyTitle}>
          {hasFilters ? "No recipes found" : "No recipes yet"}
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          {hasFilters
            ? "Try adjusting your search or filters"
            : "Create your first recipe to get started"}
        </ThemedText>
        {!hasFilters && (
          <TouchableOpacity
            style={styles.addFirstRecipeButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addFirstRecipeButtonText}>
              Create First Recipe
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <RecipeCard
      recipe={item}
      onPress={handleRecipePress}
      onEdit={handleEditRecipe}
      onDelete={handleDeleteRecipe}
      currentUserId={user?.id}
    />
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.title}>Recipes</ThemedText>
          <ThemedText style={styles.subtitle}>
            Create and share recipes
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <RecipeFilters />

      {/* Recipes List */}
      <FlatList
        data={filteredRecipes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Modal */}
      <AddEditRecipeModal
        visible={showAddModal || !!editingRecipe}
        onClose={handleCloseModals}
        recipe={editingRecipe}
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        visible={!!selectedRecipe}
        onClose={handleCloseModals}
        recipe={selectedRecipe}
        onEdit={handleEditFromDetail}
        currentUserId={user?.id}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  addButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#ef4444",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  addFirstRecipeButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstRecipeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
