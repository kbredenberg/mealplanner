import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WeeklyMealPlan } from "@/components/meal-plan/WeeklyMealPlan";
import { useMealPlan } from "@/contexts/MealPlanContext";

export default function MealsScreen() {
  const { getCurrentWeekStart, getWeekDates } = useMealPlan();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getCurrentWeekStart()
  );

  const navigateWeek = (direction: "prev" | "next") => {
    const current = new Date(currentWeekStart);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newDate.toISOString().split("T")[0]);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getCurrentWeekStart());
  };

  const formatWeekRange = (weekStart: string) => {
    const dates = getWeekDates(weekStart);
    const start = new Date(dates[0]);
    const end = new Date(dates[6]);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startStr} - ${endStr}`;
  };

  const isCurrentWeek = currentWeekStart === getCurrentWeekStart();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Meal Plan</ThemedText>
        <ThemedText style={styles.subtitle}>
          Plan your weekly meals and sync with inventory
        </ThemedText>

        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek("prev")}
          >
            <Text style={styles.navButtonText}>‹ Previous</Text>
          </TouchableOpacity>

          <View style={styles.weekInfo}>
            <Text style={styles.weekRange}>
              {formatWeekRange(currentWeekStart)}
            </Text>
            {!isCurrentWeek && (
              <TouchableOpacity
                style={styles.currentWeekButton}
                onPress={goToCurrentWeek}
              >
                <Text style={styles.currentWeekButtonText}>
                  Go to Current Week
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek("next")}
          >
            <Text style={styles.navButtonText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <WeeklyMealPlan weekStart={currentWeekStart} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  weekNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  navButtonText: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
  weekInfo: {
    alignItems: "center",
  },
  weekRange: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  currentWeekButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#3498db",
    borderRadius: 4,
  },
  currentWeekButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
});
