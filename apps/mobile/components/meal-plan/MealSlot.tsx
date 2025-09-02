import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MealPlanItem } from "@/contexts/MealPlanContext";

interface MealSlotProps {
  date: string;
  mealType: string;
  meal: MealPlanItem | null;
  onPress: () => void;
}

export function MealSlot({ date, mealType, meal, onPress }: MealSlotProps) {
  const getSlotStyle = () => {
    if (!meal) {
      return [styles.slot, styles.emptySlot];
    }

    if (meal.cooked) {
      return [styles.slot, styles.cookedSlot];
    }

    return [styles.slot, styles.plannedSlot];
  };

  const getSlotContent = () => {
    if (!meal) {
      return (
        <View style={styles.emptyContent}>
          <Text style={styles.addText}>+</Text>
        </View>
      );
    }

    return (
      <View style={styles.mealContent}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {meal.recipe?.name || "Unknown Recipe"}
        </Text>
        {meal.cooked && (
          <View style={styles.cookedIndicator}>
            <Text style={styles.cookedText}>✓</Text>
          </View>
        )}
        {meal.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {meal.notes}
          </Text>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity style={getSlotStyle()} onPress={onPress}>
      {getSlotContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    margin: 2,
    borderRadius: 6,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 76,
  },
  emptySlot: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e1e8ed",
    borderStyle: "dashed",
  },
  plannedSlot: {
    backgroundColor: "#e3f2fd",
    borderWidth: 1,
    borderColor: "#2196f3",
  },
  cookedSlot: {
    backgroundColor: "#e8f5e8",
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  emptyContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    fontSize: 24,
    color: "#bbb",
    fontWeight: "300",
  },
  mealContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  recipeName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 14,
  },
  cookedIndicator: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#4caf50",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cookedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  notes: {
    fontSize: 9,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
    textAlign: "center",
  },
});
