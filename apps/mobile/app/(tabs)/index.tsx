import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { households, currentHousehold } = useHousehold();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const handleManageHouseholds = () => {
    router.push("/household");
  };

  const handleCreateHousehold = () => {
    router.push("/household/create");
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          Welcome{user?.name ? `, ${user.name}` : ""}!
        </ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Current Household</ThemedText>
        {currentHousehold ? (
          <ThemedView
            style={[styles.householdCard, { borderColor: colors.border }]}
          >
            <ThemedView style={styles.householdInfo}>
              <ThemedText type="defaultSemiBold" style={styles.householdName}>
                {currentHousehold.name}
              </ThemedText>
              {currentHousehold.description && (
                <ThemedText style={styles.householdDescription}>
                  {currentHousehold.description}
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
                    {currentHousehold.memberCount} member
                    {currentHousehold.memberCount !== 1 ? "s" : ""}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.metaItem}>
                  <Ionicons
                    name={
                      currentHousehold.role === "ADMIN" ? "shield" : "person"
                    }
                    size={16}
                    color={colors.tabIconDefault}
                  />
                  <ThemedText style={styles.metaText}>
                    {currentHousehold.role === "ADMIN" ? "Admin" : "Member"}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageHouseholds}
            >
              <Ionicons name="settings-outline" size={20} color={colors.tint} />
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.noHouseholdCard}>
            <ThemedText style={styles.noHouseholdText}>
              No household selected
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.createHouseholdButton,
                { backgroundColor: colors.tint },
              ]}
              onPress={handleCreateHousehold}
            >
              <ThemedText style={styles.createHouseholdButtonText}>
                Create Household
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        <TouchableOpacity
          style={[styles.switchButton, { borderColor: colors.border }]}
          onPress={handleManageHouseholds}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.tint} />
          <ThemedText style={[styles.switchButtonText, { color: colors.tint }]}>
            {households.length > 1 ? "Switch Household" : "Manage Households"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Meal Planner App</ThemedText>
        <ThemedText>
          Welcome to your meal planning companion! This app will help you manage
          your household&apos;s meals, inventory, shopping lists, and recipes.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Account</ThemedText>
        <ThemedText>
          Email: <ThemedText type="defaultSemiBold">{user?.email}</ThemedText>
        </ThemedText>
        <ThemedText>
          Name:{" "}
          <ThemedText type="defaultSemiBold">
            {user?.name || "Not set"}
          </ThemedText>
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Getting Started</ThemedText>
        <ThemedText>
          • Create or join a household to collaborate with family members
        </ThemedText>
        <ThemedText>• Add ingredients to your inventory</ThemedText>
        <ThemedText>
          • Create shopping lists and sync them with your household
        </ThemedText>
        <ThemedText>• Save recipes and plan your weekly meals</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.tint }]}
          onPress={handleSignOut}
        >
          <ThemedText style={[styles.signOutButtonText, { color: "#fff" }]}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  householdCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 18,
    marginBottom: 4,
  },
  householdDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
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
  manageButton: {
    padding: 8,
  },
  noHouseholdCard: {
    alignItems: "center",
    padding: 24,
    marginVertical: 8,
  },
  noHouseholdText: {
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
  createHouseholdButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createHouseholdButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  signOutButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
