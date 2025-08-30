import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to handle authentication-based navigation
 * Automatically redirects users based on their authentication state
 */
export function useAuthNavigation() {
  const { session, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return; // Wait for initialization and loading to complete
    }

    if (session) {
      // User is authenticated, redirect to main app
      router.replace("/(tabs)");
    } else {
      // User is not authenticated, redirect to sign in
      router.replace("/auth/sign-in" as any);
    }
  }, [session, isLoading, isInitialized]);

  return {
    session,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,
  };
}

/**
 * Hook for protected routes that require authentication
 */
export function useRequireAuth() {
  const { session, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoading && !session) {
      router.replace("/auth/sign-in" as any);
    }
  }, [session, isLoading, isInitialized]);

  return {
    session,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!session,
  };
}

/**
 * Hook for auth screens that should redirect if already authenticated
 */
export function useRedirectIfAuthenticated() {
  const { session, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoading && session) {
      router.replace("/(tabs)");
    }
  }, [session, isLoading, isInitialized]);

  return {
    session,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!session,
  };
}
