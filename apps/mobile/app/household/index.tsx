import React, { useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHousehold } from "@/contexts/HouseholdContext";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HouseholdSelectionScreen() {
  const {
    households,
    currentHousehold,
    isLoading,
    error,
    loadHouseholds,
    selectHousehold,
  } = useHousehold();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  const handleSelectHousehold = (household: any) => {
    selectHousehold(household);
    Alert.alert(
      "Household Selected",
      `You are now managing "${household.name}"`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const handleCreateHousehold = () => {
    router.push("/household/create");
  };

  const handleHouseholdSettings = (household: any) => {
    router.push(`/household/${household.id}/settings`);
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title">Households</ThemedText>
        </ThemedView>

        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.tint} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={loadHouseholds}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title">Households</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateHousehold}
        >
          <Ionicons name="add" size={24} color={colors.tint} />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadHouseholds} />
        }
      >
        {households.length === 0 && !isLoading ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons
              name="home-outline"
              size={64}
              color={colors.tabIconDefault}
            />
            <ThemedText style={styles.emptyTitle}>No Households</ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Create your first household to start managing meals with your
              family or roommates.
            </ThemedText>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.tint }]}
              onPress={handleCreateHousehold}
            >
              <ThemedText style={styles.createButtonText}>
                Create Household
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.householdsList}>
            {households.map((household) => (
              <ThemedView
                key={household.id}
                style={[styles.householdCard, { borderColor: colors.border }]}
              >
                <TouchableOpacity
                  style={styles.householdContent}
                  onPress={() => handleSelectHousehold(household)}
                >
                  <ThemedView style={styles.householdInfo}>
                    <ThemedView style={styles.householdHeader}>
                      <ThemedText type="subtitle" style={styles.householdName}>
                        {household.name}
                      </ThemedText>
                      {currentHousehold?.id === household.id && (
                        <ThemedView
                          style={[
                            styles.currentBadge,
                            { backgroundColor: colors.tint },
                          ]}
                        >
                          <ThemedText style={styles.currentBadgeText}>
                            Current
                          </ThemedText>
                        </ThemedView>
                      )}
                    </ThemedView>

                    {household.description && (
                      <ThemedText style={styles.householdDescription}>
                        {household.description}
                      </ThemedText>
                    )}

                    <ThemedView style={styles.householdMeta}>
                      <ThemedView style={styles.metaItem}>
                        <Ionicons
                          name="people"
                          size={16}
                          color={colors.tabIconDefault}
                        />
                        <ThemedText style={styles.metaText}>
                          {household.memberCount} member
                          {household.memberCount !== 1 ? "s" : ""}
                        </ThemedText>
                      </ThemedView>

                      <ThemedView style={styles.metaItem}>
                        <Ionicons
                          name={
                            household.role === "ADMIN" ? "shield" : "person"
                          }
                          size={16}
                          color={colors.tabIconDefault}
                        />
                        <ThemedText style={styles.metaText}>
                          {household.role === "ADMIN" ? "Admin" : "Member"}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                  </ThemedView>

                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => handleHouseholdSettings(household)}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </ThemedView>
            ))}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  householdsList: {
    paddingBottom: 32,
  },
  householdCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  householdContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  householdInfo: {
    flex: 1,
  },
  householdHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  householdName: {
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  householdDescription: {
    marginBottom: 8,
    lineHeight: 18,
  },
  householdMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
});
