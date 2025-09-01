import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHousehold } from "@/contexts/HouseholdContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function CreateHouseholdScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createHousehold } = useHousehold();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a household name");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createHousehold({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result.success) {
        Alert.alert("Success", "Household created successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to create household");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <ThemedText type="title">Create Household</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.form}>
          <ThemedView style={styles.field}>
            <ThemedText type="subtitle" style={styles.label}>
              Household Name *
            </ThemedText>
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
              returnKeyType="next"
            />
            <ThemedText style={styles.helperText}>
              Choose a name that all household members will recognize
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="subtitle" style={styles.label}>
              Description (Optional)
            </ThemedText>
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
              returnKeyType="done"
            />
            <ThemedText style={styles.helperText}>
              Optional description to help identify this household
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.tint} />
            <ThemedView style={styles.infoContent}>
              <ThemedText style={styles.infoTitle}>
                What happens next?
              </ThemedText>
              <ThemedText style={styles.infoText}>
                • You&apos;ll be the household administrator{"\n"}• You can
                invite family members or roommates{"\n"}• Everyone can
                collaborate on meal planning and shopping lists
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      <ThemedView style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: name.trim()
                ? colors.tint
                : colors.tabIconDefault,
            },
          ]}
          onPress={handleSubmit}
          disabled={!name.trim() || isSubmitting}
        >
          <ThemedText style={styles.createButtonText}>
            {isSubmitting ? "Creating..." : "Create Household"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
  form: {
    paddingBottom: 32,
  },
  field: {
    marginBottom: 24,
  },
  label: {
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
  helperText: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    marginTop: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
