import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { MealSlot } from "./MealSlot";
import { RecipePickerModal } from "./RecipePickerModal";
import { IngredientAvailabilityModal } from "./IngredientAvailabilityModal";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"] as const;

interface WeeklyMealPlanProps {
  weekStart: string;
}

export function WeeklyMealPlan({ weekStart }: WeeklyMealPlanProps) {
  const {
    currentMealPlan,
    isLoading,
    error,
    loadMealPlan,
    getMealForSlot,
    getWeekDates,
    checkWeekAvailability,
  } = useMealPlan();

  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    mealType: string;
  } | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  useEffect(() => {
    loadMealPlan(weekStart);
    setWeekDates(getWeekDates(weekStart));
  }, [weekStart]);

  const handleSlotPress = (date: string, mealType: string) => {
    const existingMeal = getMealForSlot(date, mealType);

    if (existingMeal) {
      // Show options for existing meal
      Alert.alert(
        "Meal Options",
        `${existingMeal.recipe?.name || "Unknown Recipe"}`,
        [
          {
            text: existingMeal.cooked ? "Already Cooked" : "Mark as Cooked",
            onPress: existingMeal.cooked
              ? undefined
              : () => handleMarkAsCooked(existingMeal.id),
            style: existingMeal.cooked ? "cancel" : "default",
          },
          {
            text: "Change Recipe",
            onPress: () => {
              setSelectedSlot({ date, mealType });
              setShowRecipePicker(true);
            },
          },
          {
            text: "Remove Meal",
            onPress: () => handleRemoveMeal(existingMeal.id),
            style: "destructive",
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      // Add new meal
      setSelectedSlot({ date, mealType });
      setShowRecipePicker(true);
    }
  };

  const handleMarkAsCooked = async (mealItemId: string) => {
    const { markMealAsCooked } = useMealPlan();
    const result = await markMealAsCooked(mealItemId);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to mark meal as cooked");
    }
  };

  const handleRemoveMeal = async (mealItemId: string) => {
    const { removeMealFromSlot } = useMealPlan();
    const result = await removeMealFromSlot(mealItemId);

    if (!result.success) {
      Alert.alert("Error", result.error || "Failed to remove meal");
    }
  };

  const handleCheckAvailability = async () => {
    setShowAvailabilityModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Monday start
    return `${dayName}\n${date.getDate()}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadMealPlan(weekStart)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.weekTitle}>
          Week of {new Date(weekStart).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={styles.availabilityButton}
          onPress={handleCheckAvailability}
        >
          <Text style={styles.availabilityButtonText}>Check Ingredients</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.calendarContainer}>
          {/* Header row with days */}
          <View style={styles.headerRow}>
            <View style={styles.mealTypeColumn} />
            {weekDates.map((date) => (
              <View key={date} style={styles.dayColumn}>
                <Text style={styles.dayHeader}>{formatDateHeader(date)}</Text>
              </View>
            ))}
          </View>

          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <View key={mealType} style={styles.mealRow}>
              <View style={styles.mealTypeColumn}>
                <Text style={styles.mealTypeText}>{mealType}</Text>
              </View>
              {weekDates.map((date) => (
                <View
                  key={`${date}-${mealType}`}
                  style={styles.mealSlotContainer}
                >
                  <MealSlot
                    date={date}
                    mealType={mealType}
                    meal={getMealForSlot(date, mealType)}
                    onPress={() => handleSlotPress(date, mealType)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Recipe Picker Modal */}
      {showRecipePicker && selectedSlot && (
        <RecipePickerModal
          visible={showRecipePicker}
          date={selectedSlot.date}
          mealType={selectedSlot.mealType}
          onClose={() => {
            setShowRecipePicker(false);
            setSelectedSlot(null);
          }}
        />
      )}

      {/* Ingredient Availability Modal */}
      <IngredientAvailabilityModal
        visible={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  availabilityButton: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  availabilityButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  calendarContainer: {
    minWidth: 800, // Ensure horizontal scrolling
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#e1e8ed",
  },
  mealTypeColumn: {
    width: 100,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  dayColumn: {
    width: 100,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 18,
  },
  mealRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "capitalize",
  },
  mealSlotContainer: {
    width: 100,
    height: 80,
    borderRightWidth: 1,
    borderRightColor: "#e1e8ed",
  },
});
