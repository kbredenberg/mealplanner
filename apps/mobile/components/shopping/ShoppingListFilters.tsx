import React from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useShoppingList } from "@/contexts/ShoppingListContext";

export function ShoppingListFilters() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    showCompleted,
    setShowCompleted,
    isConnected,
  } = useShoppingList();

  return (
    <ThemedView style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            isConnected ? styles.connected : styles.disconnected,
          ]}
        />
        <ThemedText style={styles.statusText}>
          {isConnected ? "Live sync active" : "Offline mode"}
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shopping list..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filter Options */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            !showCompleted && styles.filterButtonActive,
          ]}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              !showCompleted && styles.filterButtonTextActive,
            ]}
          >
            {showCompleted ? "Hide Completed" : "Show All"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategory === null && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              selectedCategory === null && styles.filterButtonTextActive,
            ]}
          >
            All Categories
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.categoryButton,
                selectedCategory === category.name &&
                  styles.categoryButtonActive,
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category.name ? null : category.name
                )
              }
            >
              <ThemedText
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.name &&
                    styles.categoryButtonTextActive,
                ]}
              >
                {category.name} ({category.count})
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connected: {
    backgroundColor: "#10b981",
  },
  disconnected: {
    backgroundColor: "#f59e0b",
  },
  statusText: {
    fontSize: 12,
    opacity: 0.7,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  filterButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#374151",
  },
  filterButtonTextActive: {
    color: "#ffffff",
    fontWeight: "500",
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  categoryButtonActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#6b7280",
  },
  categoryButtonTextActive: {
    color: "#3b82f6",
    fontWeight: "500",
  },
});
