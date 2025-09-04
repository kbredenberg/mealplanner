import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authClient } from "@/lib/auth";

type Session = typeof authClient.$Infer.Session;
type User = Session["user"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "meal-planner-session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const user = session?.user || null;

  // Load session from secure storage on app start
  useEffect(() => {
    loadStoredSession();
  }, []);

  // Set up session refresh interval
  useEffect(() => {
    if (session) {
      const interval = setInterval(
        () => {
          refreshSession();
        },
        5 * 60 * 1000
      ); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [session]);

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);
      const storedSession = await SecureStore.getItemAsync(SESSION_KEY);

      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);

        // Check if session is still valid
        if (new Date(parsedSession.expiresAt) > new Date()) {
          setSession(parsedSession);
          // Verify session with server
          await refreshSession();
        } else {
          // Session expired, remove it
          await SecureStore.deleteItemAsync(SESSION_KEY);
          setSession(null);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      setSession(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (data && !error) {
        setSession(data);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
        return { success: true };
      } else {
        const errorMessage = error?.message || "Sign in failed";
        console.error("Sign in failed:", errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: name || "",
      });

      if (data && !error) {
        setSession(data);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
        return { success: true };
      } else {
        const errorMessage = error?.message || "Sign up failed";
        console.error("Sign up failed:", errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error("Sign up error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      if (session) {
        try {
          await authClient.signOut();
        } catch (signOutError) {
          console.error("Server sign out failed:", signOutError);
          // Continue with local cleanup even if server request fails
        }
      }

      setSession(null);
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if the server request fails, clear local session
      setSession(null);
      try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } catch (storageError) {
        console.error("Failed to clear session from storage:", storageError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      if (!session) return;

      const { data, error } = await authClient.getSession();

      if (data && !error) {
        setSession(data);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data));
      } else {
        console.log("Session refresh failed, clearing session");
        setSession(null);
        await SecureStore.deleteItemAsync(SESSION_KEY);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      // Don't clear session on network errors, only on auth errors
      if (error instanceof Error && error.message.includes("401")) {
        setSession(null);
        await SecureStore.deleteItemAsync(SESSION_KEY);
      }
    }
  };

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
