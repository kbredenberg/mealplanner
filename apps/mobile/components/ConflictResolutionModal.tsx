import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SyncConflict } from "@/lib/syncManager";
import { useInventory } from "@/contexts/InventoryContext";
import { useShoppingList } from "@/contexts/ShoppingListContext";
import { useMealPlan } from "@/contexts/MealPlanContext";

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ConflictResolutionModal({
  visible,
  onClose,
}: ConflictResolutionModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(
    null
  );
  const [isResolving, setIsResolving] = useState(false);

  const inventory = useInventory();
  const shoppingList = useShoppingList();
  const mealPlan = useMealPlan();

  const allConflicts = [
    ...inventory.conflicts.map((c) => ({
      ...c,
      context: "inventory" as const,
    })),
    ...shoppingList.conflicts.map((c) => ({
      ...c,
      context: "shopping-list" as const,
    })),
    ...mealPlan.conflicts.map((c) => ({ ...c, context: "meal-plan" as const })),
  ];

  const resolveConflict = async (
    conflict: SyncConflict & { context: string },
    resolution: "local" | "server" | "merge"
  ) => {
    setIsResolving(true);

    try {
      switch (conflict.context) {
        case "inventory":
          await inventory.resolveConflict(conflict.id, resolution);
          break;
        case "shopping-list":
          await shoppingList.resolveConflict(conflict.id, resolution);
          break;
        case "meal-plan":
          await mealPlan.resolveConflict(conflict.id, resolution);
          break;
      }

      setSelectedConflict(null);
    } catch (error) {
      console.error("Error resolving conflict:", error);
      Alert.alert("Error", "Failed to resolve conflict. Please try again.");
    } finally {
      setIsResolving(false);
    }
  };

  const resolveAllConflicts = async (
    resolution: "local" | "server" | "merge"
  ) => {
    setIsResolving(true);

    try {
      const promises = allConflicts.map((conflict) => {
        switch (conflict.context) {
          case "inventory":
            return inventory.resolveConflict(conflict.id, resolution);
          case "shopping-list":
            return shoppingList.resolveConflict(conflict.id, resolution);
          case "meal-plan":
            return mealPlan.resolveConflict(conflict.id, resolution);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      setSelectedConflict(null);
    } catch (error) {
      console.error("Error resolving conflicts:", error);
      Alert.alert(
        "Error",
        "Failed to resolve some conflicts. Please try again."
      );
    } finally {
      setIsResolving(false);
    }
  };

  const formatConflictData = (data: any, type: string) => {
    switch (type) {
      case "inventory":
        return `${data.name} - ${data.quantity} ${data.unit} (${data.category})`;
      case "shopping-list":
        return `${data.name}${data.quantity ? ` - ${data.quantity} ${data.unit || ""}` : ""} ${data.completed ? "(completed)" : ""}`;
      case "meal-plan":
        return `${data.recipe?.name || "Unknown Recipe"} - ${data.mealType} on ${data.date} ${data.cooked ? "(cooked)" : ""}`;
      default:
        return JSON.stringify(data);
    }
  };

  if (allConflicts.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Resolve Data Conflicts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {!selectedConflict ? (
          <ScrollView style={styles.content}>
            <Text style={styles.description}>
              The following items have conflicting changes. Choose how to
              resolve them:
            </Text>

            <View style={styles.bulkActions}>
              <Text style={styles.bulkActionsTitle}>
                Resolve All Conflicts:
              </Text>
              <View style={styles.bulkButtonsRow}>
                <TouchableOpacity
                  style={[styles.bulkButton, styles.localButton]}
                  onPress={() => resolveAllConflicts("local")}
                  disabled={isResolving}
                >
                  <Text style={styles.bulkButtonText}>Keep Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkButton, styles.serverButton]}
                  onPress={() => resolveAllConflicts("server")}
                  disabled={isResolving}
                >
                  <Text style={styles.bulkButtonText}>Keep Server</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkButton, styles.mergeButton]}
                  onPress={() => resolveAllConflicts("merge")}
                  disabled={isResolving}
                >
                  <Text style={styles.bulkButtonText}>Smart Merge</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.individualTitle}>Or resolve individually:</Text>

            {allConflicts.map((conflict, index) => (
              <TouchableOpacity
                key={`${conflict.context}-${conflict.id}`}
                style={styles.conflictItem}
                onPress={() => setSelectedConflict(conflict)}
              >
                <Text style={styles.conflictType}>
                  {conflict.context.replace("-", " ").toUpperCase()}
                </Text>
                <Text style={styles.conflictDescription}>
                  Local:{" "}
                  {formatConflictData(conflict.localData, conflict.context)}
                </Text>
                <Text style={styles.conflictDescription}>
                  Server:{" "}
                  {formatConflictData(conflict.serverData, conflict.context)}
                </Text>
                <Text style={styles.conflictTimestamp}>
                  Last sync:{" "}
                  {new Date(conflict.lastSyncTimestamp).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConflict(null)}
            >
              <Text style={styles.backButtonText}>← Back to list</Text>
            </TouchableOpacity>

            <Text style={styles.conflictDetailTitle}>
              {selectedConflict.context.replace("-", " ").toUpperCase()}{" "}
              Conflict
            </Text>

            <View style={styles.conflictDetail}>
              <Text style={styles.versionTitle}>Your Version (Local):</Text>
              <Text style={styles.versionData}>
                {formatConflictData(
                  selectedConflict.localData,
                  selectedConflict.context
                )}
              </Text>
              <Text style={styles.versionTimestamp}>
                Modified:{" "}
                {new Date(selectedConflict.localTimestamp).toLocaleString()}
              </Text>
            </View>

            <View style={styles.conflictDetail}>
              <Text style={styles.versionTitle}>Server Version:</Text>
              <Text style={styles.versionData}>
                {formatConflictData(
                  selectedConflict.serverData,
                  selectedConflict.context
                )}
              </Text>
              <Text style={styles.versionTimestamp}>
                Modified:{" "}
                {new Date(selectedConflict.serverTimestamp).toLocaleString()}
              </Text>
            </View>

            <View style={styles.resolutionButtons}>
              <TouchableOpacity
                style={[styles.resolutionButton, styles.localButton]}
                onPress={() => resolveConflict(selectedConflict, "local")}
                disabled={isResolving}
              >
                <Text style={styles.resolutionButtonText}>
                  Keep Local Version
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resolutionButton, styles.serverButton]}
                onPress={() => resolveConflict(selectedConflict, "server")}
                disabled={isResolving}
              >
                <Text style={styles.resolutionButtonText}>
                  Keep Server Version
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resolutionButton, styles.mergeButton]}
                onPress={() => resolveConflict(selectedConflict, "merge")}
                disabled={isResolving}
              >
                <Text style={styles.resolutionButtonText}>Smart Merge</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  bulkActions: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  bulkButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulkButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  bulkButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  individualTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  conflictItem: {
    padding: 16,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  conflictType: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 8,
  },
  conflictDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  conflictTimestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  conflictDetailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  conflictDetail: {
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 16,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  versionData: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  versionTimestamp: {
    fontSize: 12,
    color: "#666",
  },
  resolutionButtons: {
    gap: 12,
    marginTop: 20,
  },
  resolutionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  resolutionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  localButton: {
    backgroundColor: "#28A745",
  },
  serverButton: {
    backgroundColor: "#007AFF",
  },
  mergeButton: {
    backgroundColor: "#FFC107",
  },
});
