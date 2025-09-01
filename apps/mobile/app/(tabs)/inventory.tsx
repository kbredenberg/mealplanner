import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useInventory, InventoryItem } from "@/contexts/InventoryContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { InventoryItemCard } from "@/components/inventory/InventoryItemCard";
import { AddEditItemModal } from "@/components/inventory/AddEditItemModal";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";

export default function InventoryScreen() {
  const { currentHousehold } = useHousehold();
  const {
    getFilteredItems,
    isLoading,
    error,
    loadInventory,
    searchQuery,
    selectedCategory,
  } = useInventory();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const filteredItems = getFilteredItems();

  useEffect(() => {
    if (currentHousehold) {
      loadInventory();
    }
  }, [currentHousehold, loadInventory]);

  const handleRefresh = async () => {
    if (currentHousehold) {
      await loadInventory();
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
  };

  if (!currentHousehold) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.noHouseholdContainer}>
          <ThemedText style={styles.noHouseholdText}>
            Please select a household to view inventory
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

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

    const hasFilters = searchQuery.trim() || selectedCategory;

    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyTitle}>
          {hasFilters ? "No items found" : "No inventory items"}
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          {hasFilters
            ? "Try adjusting your search or filters"
            : "Add your first inventory item to get started"}
        </ThemedText>
        {!hasFilters && (
          <TouchableOpacity
            style={styles.addFirstItemButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addFirstItemButtonText}>Add First Item</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <InventoryItemCard item={item} onEdit={handleEditItem} />
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.title}>Inventory</ThemedText>
          <ThemedText style={styles.subtitle}>
            {currentHousehold.name}
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
      <InventoryFilters />

      {/* Items List */}
      <FlatList
        data={filteredItems}
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
      <AddEditItemModal
        visible={showAddModal || !!editingItem}
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
  noHouseholdContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noHouseholdText: {
    fontSize: 18,
    textAlign: "center",
    opacity: 0.7,
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
  addFirstItemButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstItemButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
