import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HouseholdSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { households, updateHousehold, deleteHousehold } = useHousehold();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const household = households.find((h) => h.id === id);
  const isAdmin = household?.role === "ADMIN";
  const isCreator = household?.creatorId === user?.id;

  useEffect(() => {
    if (household) {
      setName(household.name);
      setDescription(household.description || "");
    }
  }, [household]);

  const handleSave = async () => {
    if (!household || !name.trim()) {
      Alert.alert("Error", "Please enter a household name");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateHousehold(household.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result.success) {
        Alert.alert("Success", "Household updated successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to update household");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!household) return;

    Alert.alert(
      "Delete Household",
      `Are you sure you want to delete "${household.name}"? This action cannot be undone and will remove all data associated with this household.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!household) return;

    setIsDeleting(true);

    try {
      const result = await deleteHousehold(household.id);

      if (result.success) {
        Alert.alert(
          "Household Deleted",
          "The household has been deleted successfully.",
          [{ text: "OK", onPress: () => router.replace("/household") }]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to delete household");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManageMembers = () => {
    router.push(`/household/${id}/members`);
  };

  if (!household) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title">Household Settings</ThemedText>
        </ThemedView>

        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.tint} />
          <ThemedText style={styles.errorText}>Household not found</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title">Household Settings</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Household Name</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter household name"
              placeholderTextColor={colors.tabIconDefault}
              maxLength={50}
              autoCapitalize="words"
              editable={isAdmin}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description for your household"
              placeholderTextColor={colors.tabIconDefault}
              maxLength={200}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={isAdmin}
            />
          </ThemedView>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <ThemedText style={styles.saveButtonText}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Members & Invitations
          </ThemedText>

          <TouchableOpacity
            style={[styles.menuItem, { borderColor: colors.border }]}
            onPress={handleManageMembers}
          >
            <ThemedView style={styles.menuItemContent}>
              <Ionicons name="people" size={20} color={colors.tint} />
              <ThemedView style={styles.menuItemText}>
                <ThemedText style={styles.menuItemTitle}>
                  Manage Members
                </ThemedText>
                <ThemedText style={styles.menuItemDescription}>
                  View members, send invitations, and manage roles
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Household Information
          </ThemedText>

          <ThemedView style={[styles.infoCard, { borderColor: colors.border }]}>
            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Your Role:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {household.role === "ADMIN" ? "Administrator" : "Member"}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Created:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(household.createdAt).toLocaleDateString()}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Members:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {household.memberCount}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {isCreator && (
          <ThemedView style={styles.section}>
            <ThemedText
              type="subtitle"
              style={[styles.sectionTitle, { color: "#FF3B30" }]}
            >
              Danger Zone
            </ThemedText>

            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: "#FF3B30" }]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <ThemedText style={styles.deleteButtonText}>
                {isDeleting ? "Deleting..." : "Delete Household"}
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.deleteWarning}>
              This will permanently delete the household and all associated
              data. This action cannot be undone.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  placeholder: {
    width: 40,
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
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteWarning: {
    fontSize: 14,
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});
