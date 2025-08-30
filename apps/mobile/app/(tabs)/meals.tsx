import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function MealsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>Meal Plan</ThemedText>
        <ThemedText style={styles.subtitle}>
          Plan your weekly meals and sync with inventory
        </ThemedText>

        <ThemedView style={styles.placeholder}>
          <ThemedText style={styles.placeholderText}>
            Meal planning features will be implemented in upcoming tasks
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
  },
  placeholder: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.6,
  },
});
