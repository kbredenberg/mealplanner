import { Stack } from "expo-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function HouseholdLayout() {
  return (
    <ProtectedRoute>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="[id]/settings" />
        <Stack.Screen name="[id]/members" />
      </Stack>
    </ProtectedRoute>
  );
}
