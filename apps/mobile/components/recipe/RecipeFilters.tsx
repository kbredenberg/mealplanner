import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRecipe } from "@/contexts/RecipeContext";

export function RecipeFilters() {
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    availableTags,
  } = useRecipe();

  const [showTagModal, setShowTagModal] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery.trim() || selectedTags.length > 0;

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes, ingredients, or tags..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filter Controls */}
      <View style={styles.filterControls}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedTags.length > 0 && styles.filterButtonActive,
          ]}
          onPress={() => setShowTagModal(true)}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedTags.length > 0 && styles.filterButtonTextActive,
            ]}
          >
            Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Tags */}
      {selectedTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeTagsContainer}
          contentContainerStyle={styles.activeTagsContent}
        >
          {selectedTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={styles.activeTag}
              onPress={() => handleTagToggle(tag)}
            >
              <Text style={styles.activeTagText}>{tag}</Text>
              <Text style={styles.activeTagRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tag Selection Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTagModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Filter by Tags</ThemedText>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTagModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {availableTags.length === 0 ? (
              <View style={styles.noTagsContainer}>
                <ThemedText style={styles.noTagsText}>
                  No tags available yet. Tags will appear here as you create
                  recipes with tags.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.tagGrid}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagOption,
                      selectedTags.includes(tag) && styles.tagOptionSelected,
                    ]}
                    onPress={() => handleTagToggle(tag)}
                  >
                    <Text
                      style={[
                        styles.tagOptionText,
                        selectedTags.includes(tag) &&
                          styles.tagOptionTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  filterControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  filterButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#ef4444",
  },
  clearButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
  activeTagsContainer: {
    paddingBottom: 12,
  },
  activeTagsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    gap: 6,
  },
  activeTagText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "500",
  },
  activeTagRemove: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  noTagsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noTagsText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 24,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tagOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  tagOptionSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  tagOptionText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  tagOptionTextSelected: {
    color: "#ffffff",
  },
});
