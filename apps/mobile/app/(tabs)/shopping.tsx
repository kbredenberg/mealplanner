import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  useShoppingList,
  ShoppingListItem,
} from "@/contexts/ShoppingListContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { ShoppingListItemCard } from "@/components/shopping/ShoppingListItemCard";
import { AddEditShoppingItemModal } from "@/components/shopping/AddEditShoppingItemModal";
import { ShoppingListFilters } from "@/components/shopping/ShoppingListFilters";

export default function ShoppingScreen() {
  const {
    getFilteredItems,
    isLoading,
    error,
    loadShoppingList,
    bulkOperation,
    convertToInventory,
  } = useShoppingList();
  const { currentHousehold } = useHousehold();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filteredItems = getFilteredItems();

  // Reset selection when leaving selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedItems(new Set());
    }
  }, [selectionMode]);

  const handleRefresh = async () => {
    await loadShoppingList();
  };

  const handleEditItem = (item: ShoppingListItem) => {
    setEditingItem(item);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
  };

  const handleSelectItem = (item: ShoppingListItem) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkComplete = async () => {
    if (selectedItems.size === 0) return;

    const result = await bulkOperation("complete", Array.from(selectedItems));
    if (result.success) {
      setSelectionMode(false);
    } else {
      Alert.alert("Error", result.error || "Failed to complete items");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      "Delete Items",
      `Are you sure you want to delete ${selectedItems.size} item(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await bulkOperation(
              "delete",
              Array.from(selectedItems)
            );
            if (result.success) {
              setSelectionMode(false);
            } else {
              Alert.alert("Error", result.error || "Failed to delete items");
            }
          },
        },
      ]
    );
  };

  const handleConvertToInventory = async () => {
    Alert.alert(
      "Convert to Inventory",
      "Convert all completed items to inventory?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert",
          onPress: async () => {
            const result = await convertToInventory();
            if (result.success) {
              const summary = result.data?.summary;
              if (summary) {
                Alert.alert(
                  "Conversion Complete",
                  `Converted ${summary.totalConverted} items to inventory.\n` +
                    `Skipped ${summary.totalSkipped} items.\n` +
                    (summary.totalErrors > 0
                      ? `${summary.totalErrors} errors occurred.`
                      : "")
                );
              }
            } else {
              Alert.alert("Error", result.error || "Failed to convert items");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <ShoppingListItemCard
      item={item}
      onEdit={handleEditItem}
      isSelected={selectedItems.has(item.id)}
      onSelect={handleSelectItem}
      selectionMode={selectionMode}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>
        {currentHousehold
          ? "No items in shopping list"
          : "No household selected"}
      </ThemedText>
      <ThemedText style={styles.emptyStateText}>
        {currentHousehold
          ? "Add items to start collaborating on your shopping list"
          : "Select a household to view your shopping list"}
      </ThemedText>
      {currentHousehold && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <ThemedText style={styles.addButtonText}>Add First Item</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <ThemedText style={styles.title}>Shopping List</ThemedText>
        {currentHousehold && (
          <ThemedText style={styles.householdName}>
            {currentHousehold.name}
          </ThemedText>
        )}
      </View>

      {currentHousehold && filteredItems.length > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSelectionMode(!selectionMode)}
          >
            <ThemedText style={styles.headerButtonText}>
              {selectionMode ? "Cancel" : "Select"}
            </ThemedText>
          </TouchableOpacity>

          {!selectionMode && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleConvertToInventory}
            >
              <ThemedText style={styles.headerButtonText}>
                Convert Completed
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderSelectionActions = () => {
    if (!selectionMode || selectedItems.size === 0) return null;

    return (
      <View style={styles.selectionActions}>
        <ThemedText style={styles.selectionCount}>
          {selectedItems.size} item(s) selected
        </ThemedText>
        <View style={styles.selectionButtons}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleBulkComplete}
          >
            <ThemedText style={styles.selectionButtonText}>Complete</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, styles.deleteSelectionButton]}
            onPress={handleBulkDelete}
          >
            <ThemedText
              style={[
                styles.selectionButtonText,
                styles.deleteSelectionButtonText,
              ]}
            >
              Delete
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {renderHeader()}

      {currentHousehold && <ShoppingListFilters />}

      {renderSelectionActions()}

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredItems.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {currentHousehold && !selectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <ThemedText style={styles.fabText}>+</ThemedText>
        </TouchableOpacity>
      )}

      <AddEditShoppingItemModal
        visible={showAddModal || editingItem !== null}
        onClose={handleCloseModal}
        item={editingItem}
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  householdName: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
  selectionButtons: {
    flexDirection: "row",
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  },
  deleteSelectionButton: {
    backgroundColor: "#ef4444",
  },
  deleteSelectionButtonText: {
    color: "#ffffff",
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
});
