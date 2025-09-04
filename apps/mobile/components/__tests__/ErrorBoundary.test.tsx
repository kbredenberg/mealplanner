import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import ErrorBoundary from "../ErrorBoundary";

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <Text>No error</Text>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when there is no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText("No error")).toBeTruthy();
  });

  it("renders error UI when there is an error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText("Oops! Something went wrong")).toBeTruthy();
    expect(
      getByText(
        "We're sorry for the inconvenience. The app encountered an unexpected error."
      )
    ).toBeTruthy();
  });

  it("calls onError callback when error occurs", () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it("renders custom fallback when provided", () => {
    const customFallback = (
      error: Error,
      errorInfo: React.ErrorInfo,
      retry: () => void
    ) => <Text>Custom error message: {error.message}</Text>;

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText("Custom error message: Test error")).toBeTruthy();
  });

  it("resets error state when retry is called", () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(getByText("Oops! Something went wrong")).toBeTruthy();

    // Click retry button
    const retryButton = getByText("Try Again");
    fireEvent.press(retryButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText("No error")).toBeTruthy();
  });
});
