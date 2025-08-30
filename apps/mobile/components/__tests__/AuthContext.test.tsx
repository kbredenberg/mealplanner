import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Mock SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock auth client
jest.mock("@/lib/auth", () => ({
  authClient: {
    signIn: {
      email: jest.fn(),
    },
    signUp: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
    getSession: jest.fn(),
  },
}));

// Test component to access auth context
function TestComponent() {
  const { isInitialized, isLoading, session } = useAuth();

  return (
    <>
      <div testID="initialized">{isInitialized ? "true" : "false"}</div>
      <div testID="loading">{isLoading ? "true" : "false"}</div>
      <div testID="session">
        {session ? "authenticated" : "not-authenticated"}
      </div>
    </>
  );
}

describe("AuthContext", () => {
  it("should initialize properly", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading and not initialized
    expect(getByTestId("loading").children[0]).toBe("false");
    expect(getByTestId("initialized").children[0]).toBe("false");
    expect(getByTestId("session").children[0]).toBe("not-authenticated");

    // Wait for initialization
    await waitFor(() => {
      expect(getByTestId("initialized").children[0]).toBe("true");
    });
  });

  it("should provide auth methods", () => {
    let authMethods: any;

    function TestMethodsComponent() {
      authMethods = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <TestMethodsComponent />
      </AuthProvider>
    );

    expect(authMethods).toHaveProperty("signIn");
    expect(authMethods).toHaveProperty("signUp");
    expect(authMethods).toHaveProperty("signOut");
    expect(authMethods).toHaveProperty("refreshSession");
    expect(typeof authMethods.signIn).toBe("function");
    expect(typeof authMethods.signUp).toBe("function");
    expect(typeof authMethods.signOut).toBe("function");
    expect(typeof authMethods.refreshSession).toBe("function");
  });
});
