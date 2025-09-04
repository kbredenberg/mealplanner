import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Alert } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
  retries?: number;
  retryDelay?: number;
  showErrorAlert?: boolean;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, any>;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
}

export function useApi() {
  const { session, refreshSession } = useAuth();
  const { isConnected } = useNetworkStatus();

  const createApiError = (
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, any>
  ): ApiError => {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.code = code;
    error.details = details;
    return error;
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const makeRequest = async (
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<Response> => {
    const {
      requireAuth = true,
      retries = 3,
      retryDelay = 1000,
      showErrorAlert = true,
      ...fetchOptions
    } = options;

    // Check network connectivity
    if (!isConnected) {
      const error = createApiError(
        "No internet connection",
        0,
        "NETWORK_ERROR"
      );
      if (showErrorAlert) {
        Alert.alert(
          "Network Error",
          "Please check your internet connection and try again."
        );
      }
      throw error;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    };

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        // Handle 401 Unauthorized - refresh session and retry once
        if (response.status === 401 && requireAuth && attempt === 0) {
          try {
            await refreshSession();
            // Retry the request with refreshed session
            const retryResponse = await fetch(url, {
              ...fetchOptions,
              headers,
            });

            if (retryResponse.ok) {
              return retryResponse;
            }

            // If retry also fails, parse the error response
            const errorData: ApiResponse = await retryResponse
              .json()
              .catch(() => ({}));
            throw createApiError(
              errorData.error || "Authentication failed",
              retryResponse.status,
              errorData.code,
              errorData.details
            );
          } catch (refreshError) {
            throw createApiError(
              "Session refresh failed",
              401,
              "SESSION_REFRESH_FAILED"
            );
          }
        }

        if (!response.ok) {
          // Parse error response
          const errorData: ApiResponse = await response
            .json()
            .catch(() => ({}));
          const error = createApiError(
            errorData.error || `HTTP error! status: ${response.status}`,
            response.status,
            errorData.code,
            errorData.details
          );

          // Don't retry client errors (4xx) except 401 and 429
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 401 &&
            response.status !== 429
          ) {
            throw error;
          }

          lastError = error;

          // If this is the last attempt, throw the error
          if (attempt === retries) {
            throw error;
          }

          // Wait before retrying
          await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          // Network error
          lastError = createApiError(
            "Network request failed",
            0,
            "NETWORK_ERROR"
          );
        } else if (error instanceof Error && (error as ApiError).status) {
          // API error
          lastError = error as ApiError;
        } else {
          // Unknown error
          lastError = createApiError(
            "An unexpected error occurred",
            500,
            "UNKNOWN_ERROR"
          );
        }

        // If this is the last attempt, throw the error
        if (attempt === retries) {
          if (showErrorAlert && lastError.code !== "NETWORK_ERROR") {
            Alert.alert("Request Failed", getErrorMessage(lastError), [
              { text: "OK" },
            ]);
          }
          throw lastError;
        }

        // Wait before retrying
        await sleep(retryDelay * Math.pow(2, attempt));
      }
    }

    // This should never be reached, but just in case
    throw (
      lastError ||
      createApiError("Request failed after all retries", 500, "RETRY_EXHAUSTED")
    );
  };

  const parseResponse = async <T = any>(response: Response): Promise<T> => {
    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw createApiError(
        data.error || "Request failed",
        response.status,
        data.code,
        data.details
      );
    }

    return data.data as T;
  };

  const getErrorMessage = (error: ApiError): string => {
    if (error.code === "VALIDATION_ERROR" && error.details) {
      const validationErrors = Object.entries(error.details)
        .map(
          ([field, messages]) =>
            `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`
        )
        .join("\n");
      return `Validation failed:\n${validationErrors}`;
    }

    switch (error.code) {
      case "NETWORK_ERROR":
        return "Please check your internet connection and try again.";
      case "UNAUTHORIZED":
        return "Please sign in to continue.";
      case "SESSION_EXPIRED":
        return "Your session has expired. Please sign in again.";
      case "FORBIDDEN":
      case "HOUSEHOLD_ACCESS_DENIED":
        return "You don't have permission to perform this action.";
      case "NOT_FOUND":
      case "RESOURCE_NOT_FOUND":
        return "The requested resource was not found.";
      case "DUPLICATE_RESOURCE":
        return "This resource already exists.";
      case "INSUFFICIENT_INVENTORY":
        return "Not enough ingredients in inventory.";
      case "RECIPE_NOT_AVAILABLE":
        return "The selected recipe is not available.";
      case "MEAL_ALREADY_COOKED":
        return "This meal has already been marked as cooked.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  };

  const get = async <T = any>(
    endpoint: string,
    options?: ApiOptions
  ): Promise<T> => {
    const response = await makeRequest(endpoint, { ...options, method: "GET" });
    return parseResponse<T>(response);
  };

  const post = async <T = any>(
    endpoint: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> => {
    const response = await makeRequest(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
    return parseResponse<T>(response);
  };

  const put = async <T = any>(
    endpoint: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> => {
    const response = await makeRequest(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
    return parseResponse<T>(response);
  };

  const patch = async <T = any>(
    endpoint: string,
    data?: any,
    options?: ApiOptions
  ): Promise<T> => {
    const response = await makeRequest(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
    return parseResponse<T>(response);
  };

  const del = async <T = any>(
    endpoint: string,
    options?: ApiOptions
  ): Promise<T> => {
    const response = await makeRequest(endpoint, {
      ...options,
      method: "DELETE",
    });
    return parseResponse<T>(response);
  };

  const getBaseUrl = () => API_BASE_URL;

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    makeRequest,
    parseResponse,
    getErrorMessage,
    getBaseUrl,
  };
}
