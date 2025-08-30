import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

export default function IndexScreen() {
  const { session, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/sign-in" as any);
      }
    }
  }, [session, isLoading, isInitialized]);

  return (
    <ThemedView
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <ActivityIndicator size="large" />
      <ThemedText style={{ marginTop: 16 }}>
        {!isInitialized ? "Initializing..." : "Loading..."}
      </ThemedText>
    </ThemedView>
  );
}
