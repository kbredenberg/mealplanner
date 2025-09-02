import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useInventory } from "@/contexts/InventoryContext";
import { useShoppingList } from "@/contexts/ShoppingListContext";
import { useMealPlan } from "@/contexts/MealPlanContext";

interface OfflineStatusBarProps {
  onSyncPress?: () => void;
  onConflictsPress?: () => void;
}

export function OfflineStatusBar({
  onSyncPress,
  onConflictsPress,
}: OfflineStatusBarProps) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const inventory = useInventory();
  const shoppingList = useShoppingList();
  const mealPlan = useMealPlan();

  const isOnline = isConnected && isInternetReachable !== false;
  const totalPendingOperations =
    inventory.pendingOperations +
    shoppingList.pendingOperations +
    mealPlan.pendingOperations;
  const totalConflicts =
    inventory.conflicts.length +
    shoppingList.conflicts.length +
    mealPlan.conflicts.length;

  const handleSync = async () => {
    if (!isOnline) return;

    try {
      await Promise.all([
        inventory.syncData(),
        shoppingList.syncData(),
        mealPlan.syncData(),
      ]);
    } catch (error) {
      console.error("Error syncing data:", error);
    }

    onSyncPress?.();
  };

  if (isOnline && totalPendingOperations === 0 && totalConflicts === 0) {
    return null; // Don't show anything when everything is synced
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {!isOnline && (
          <View style={styles.statusSection}>
            <View style={[styles.indicator, styles.offlineIndicator]} />
            <Text style={styles.statusText}>Offline</Text>
          </View>
        )}

        {totalPendingOperations > 0 && (
          <View style={styles.statusSection}>
            <Text style={styles.pendingText}>
              {totalPendingOperations} pending change
              {totalPendingOperations !== 1 ? "s" : ""}
            </Text>
            {isOnline && (
              <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
                <Text style={styles.syncButtonText}>Sync</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {totalConflicts > 0 && (
          <TouchableOpacity
            onPress={onConflictsPress}
            style={styles.conflictsButton}
          >
            <Text style={styles.conflictsText}>
              {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""} need
              resolution
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF3CD",
    borderBottomWidth: 1,
    borderBottomColor: "#FFEAA7",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offlineIndicator: {
    backgroundColor: "#E74C3C",
  },
  statusText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  pendingText: {
    fontSize: 14,
    color: "#856404",
  },
  syncButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  conflictsButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conflictsText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
