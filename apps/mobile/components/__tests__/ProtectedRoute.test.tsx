import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

// Mock the auth context
jest.mock("@/contexts/AuthContext");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading when not initialized", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isLoading: false,
      isInitialized: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    });

    const { getByText } = render(
      <ProtectedRoute>
        <Text>Protected Content</Text>
      </ProtectedRoute>
    );

    expect(getByText("Initializing...")).toBeTruthy();
  });

  it("should show loading when loading", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isLoading: true,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    });

    const { getByText } = render(
      <ProtectedRoute>
        <Text>Protected Content</Text>
      </ProtectedRoute>
    );

    expect(getByText("Loading...")).toBeTruthy();
  });

  it("should render children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: "1", email: "test@example.com" } } as any,
      user: { id: "1", email: "test@example.com" } as any,
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    });

    const { getByText } = render(
      <ProtectedRoute>
        <Text>Protected Content</Text>
      </ProtectedRoute>
    );

    expect(getByText("Protected Content")).toBeTruthy();
  });

  it("should show redirecting when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    });

    const { getByText } = render(
      <ProtectedRoute>
        <Text>Protected Content</Text>
      </ProtectedRoute>
    );

    expect(getByText("Redirecting...")).toBeTruthy();
  });
});
