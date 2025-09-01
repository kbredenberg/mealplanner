import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export function useApi() {
  const { session, refreshSession } = useAuth();

  const makeRequest = async (endpoint: string, options: ApiOptions = {}) => {
    const { requireAuth = true, ...fetchOptions } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add authorization header if session exists and auth is required
    // Better Auth handles authentication via cookies, so we don't need to manually add tokens
    // The session is used for client-side state management only

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized - refresh session and retry
      if (response.status === 401 && requireAuth) {
        await refreshSession();
        // Retry the request with refreshed session
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }

        return retryResponse;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  };

  const get = (endpoint: string, options?: ApiOptions) =>
    makeRequest(endpoint, { ...options, method: "GET" });

  const post = (endpoint: string, data?: any, options?: ApiOptions) =>
    makeRequest(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });

  const put = (endpoint: string, data?: any, options?: ApiOptions) =>
    makeRequest(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });

  const patch = (endpoint: string, data?: any, options?: ApiOptions) =>
    makeRequest(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });

  const del = (endpoint: string, options?: ApiOptions) =>
    makeRequest(endpoint, { ...options, method: "DELETE" });

  const getBaseUrl = () => API_BASE_URL;

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    makeRequest,
    getBaseUrl,
  };
}
