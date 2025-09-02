import { useCallback, useEffect } from "react";
import { useApi } from "./useApi";
import { useNetworkStatus } from "./useNetworkStatus";
import { storage, PendingOperation } from "@/lib/storage";

export interface OfflineApiOptions {
  cacheKey?: string;
  cacheMaxAge?: number; // in milliseconds
  enableOptimisticUpdates?: boolean;
  retryOnReconnect?: boolean;
}

export function useOfflineApi() {
  const api = useApi();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable !== false;

  // Process pending operations when coming back online
  useEffect(() => {
    if (isOnline) {
      processPendingOperations();
    }
  }, [isOnline]);

  const processPendingOperations = useCallback(async () => {
    try {
      const pendingOps = await storage.getPendingOperations();

      for (const operation of pendingOps) {
        try {
          await executeOperation(operation);
          await storage.removePendingOperation(operation.id);
        } catch (error) {
          console.error("Failed to execute pending operation:", error);

          // Increment retry count
          const newRetryCount = operation.retryCount + 1;

          // Remove operation if it has failed too many times (max 3 retries)
          if (newRetryCount >= 3) {
            await storage.removePendingOperation(operation.id);
            console.warn(
              "Removing failed operation after 3 retries:",
              operation
            );
          } else {
            await storage.updatePendingOperation(operation.id, {
              retryCount: newRetryCount,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing pending operations:", error);
    }
  }, []);

  const executeOperation = async (operation: PendingOperation) => {
    const { type, endpoint, data } = operation;

    switch (type) {
      case "CREATE":
        return await api.post(endpoint, data);
      case "UPDATE":
        return await api.put(endpoint, data);
      case "DELETE":
        return await api.delete(endpoint);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  };

  const get = useCallback(
    async (endpoint: string, options: OfflineApiOptions = {}) => {
      const { cacheKey, cacheMaxAge = 5 * 60 * 1000 } = options;
      const key = cacheKey || endpoint;

      // Try to get from cache first
      if (cacheKey) {
        const cached = await storage.getCache(key);
        if (cached && storage.isCacheValid(cached, cacheMaxAge)) {
          return {
            json: async () => ({ success: true, data: cached.data }),
            ok: true,
            status: 200,
            fromCache: true,
          };
        }
      }

      // If online, fetch from API
      if (isOnline) {
        try {
          const response = await api.get(endpoint);

          // Cache the response if successful and cacheKey is provided
          if (response.ok && cacheKey) {
            const data = await response.json();
            if (data.success) {
              await storage.setCache(key, data.data);
            }
            // Return a new response object since we consumed the original
            return {
              json: async () => data,
              ok: response.ok,
              status: response.status,
              fromCache: false,
            };
          }

          return { ...response, fromCache: false };
        } catch (error) {
          // If API fails but we have cached data, return it
          if (cacheKey) {
            const cached = await storage.getCache(key);
            if (cached) {
              return {
                json: async () => ({ success: true, data: cached.data }),
                ok: true,
                status: 200,
                fromCache: true,
                stale: true,
              };
            }
          }
          throw error;
        }
      }

      // If offline, try to return cached data
      if (cacheKey) {
        const cached = await storage.getCache(key);
        if (cached) {
          return {
            json: async () => ({ success: true, data: cached.data }),
            ok: true,
            status: 200,
            fromCache: true,
            offline: true,
          };
        }
      }

      // No cached data available
      throw new Error("No internet connection and no cached data available");
    },
    [api, isOnline]
  );

  const post = useCallback(
    async (endpoint: string, data: any, options: OfflineApiOptions = {}) => {
      const { enableOptimisticUpdates = true } = options;

      if (isOnline) {
        try {
          return await api.post(endpoint, data);
        } catch (error) {
          // If online but request fails, queue for later
          if (enableOptimisticUpdates) {
            await storage.addPendingOperation({
              type: "CREATE",
              endpoint,
              data,
            });
          }
          throw error;
        }
      } else {
        // If offline, queue the operation
        if (enableOptimisticUpdates) {
          await storage.addPendingOperation({
            type: "CREATE",
            endpoint,
            data,
          });

          // Return a mock successful response for optimistic updates
          return {
            json: async () => ({
              success: true,
              data: { ...data, id: `temp_${Date.now()}`, pending: true },
            }),
            ok: true,
            status: 201,
            pending: true,
          };
        } else {
          throw new Error("No internet connection");
        }
      }
    },
    [api, isOnline]
  );

  const put = useCallback(
    async (endpoint: string, data: any, options: OfflineApiOptions = {}) => {
      const { enableOptimisticUpdates = true } = options;

      if (isOnline) {
        try {
          return await api.put(endpoint, data);
        } catch (error) {
          // If online but request fails, queue for later
          if (enableOptimisticUpdates) {
            await storage.addPendingOperation({
              type: "UPDATE",
              endpoint,
              data,
            });
          }
          throw error;
        }
      } else {
        // If offline, queue the operation
        if (enableOptimisticUpdates) {
          await storage.addPendingOperation({
            type: "UPDATE",
            endpoint,
            data,
          });

          // Return a mock successful response for optimistic updates
          return {
            json: async () => ({
              success: true,
              data: { ...data, pending: true },
            }),
            ok: true,
            status: 200,
            pending: true,
          };
        } else {
          throw new Error("No internet connection");
        }
      }
    },
    [api, isOnline]
  );

  const del = useCallback(
    async (endpoint: string, options: OfflineApiOptions = {}) => {
      const { enableOptimisticUpdates = true } = options;

      if (isOnline) {
        try {
          return await api.delete(endpoint);
        } catch (error) {
          // If online but request fails, queue for later
          if (enableOptimisticUpdates) {
            await storage.addPendingOperation({
              type: "DELETE",
              endpoint,
            });
          }
          throw error;
        }
      } else {
        // If offline, queue the operation
        if (enableOptimisticUpdates) {
          await storage.addPendingOperation({
            type: "DELETE",
            endpoint,
          });

          // Return a mock successful response for optimistic updates
          return {
            json: async () => ({ success: true }),
            ok: true,
            status: 200,
            pending: true,
          };
        } else {
          throw new Error("No internet connection");
        }
      }
    },
    [api, isOnline]
  );

  const clearCache = useCallback(async () => {
    await storage.clearCache();
  }, []);

  const clearPendingOperations = useCallback(async () => {
    await storage.clearPendingOperations();
  }, []);

  const getPendingOperationsCount = useCallback(async () => {
    const operations = await storage.getPendingOperations();
    return operations.length;
  }, []);

  return {
    get,
    post,
    put,
    delete: del,
    isOnline,
    clearCache,
    clearPendingOperations,
    getPendingOperationsCount,
    processPendingOperations,
  };
}
