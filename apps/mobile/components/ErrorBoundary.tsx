import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Props {
  children: ReactNode;
  fallback?: (
    error: Error,
    errorInfo: React.ErrorInfo,
    retry: () => void
  ) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (__DEV__) {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Error info:", errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to log to a crash reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.state.errorInfo!,
          this.retry
        );
      }

      // Default error UI
      return (
        <DefaultErrorFallback error={this.state.error!} retry={this.retry} />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    message: {
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
      marginBottom: 24,
      opacity: 0.8,
    },
    errorContainer: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
      maxHeight: 200,
      width: "100%",
    },
    errorText: {
      fontSize: 12,
      color: "#ff6b6b",
      fontFamily: "monospace",
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      backgroundColor: colors.tint,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.tint,
    },
    secondaryButtonText: {
      color: colors.tint,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.message}>
        We're sorry for the inconvenience. The app encountered an unexpected
        error.
      </Text>

      {__DEV__ && (
        <ScrollView style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.name}: {error.message}
            {"\n\n"}
            {error.stack}
          </Text>
        </ScrollView>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    if (__DEV__) {
      console.error("Error caught by useErrorHandler:", error);
      if (errorInfo) {
        console.error("Error info:", errorInfo);
      }
    }

    // In production, log to crash reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  };
}

// Higher-order component for class components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Main ErrorBoundary component
export function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

export default ErrorBoundary;
