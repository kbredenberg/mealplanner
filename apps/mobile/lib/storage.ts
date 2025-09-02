import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  version: number;
}

export interface PendingOperation {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  householdId?: string;
}

class StorageManager {
  private static instance: StorageManager;
  private readonly CACHE_PREFIX = "cache_";
  private readonly PENDING_PREFIX = "pending_";
  private readonly METADATA_PREFIX = "meta_";

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // Cache management
  async setCache<T>(key: string, data: T, version: number = 1): Promise<void> {
    const item: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      version,
    };

    try {
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(item)
      );
    } catch (error) {
      console.error("Error setting cache:", error);
    }
  }

  async getCache<T>(key: string): Promise<StorageItem<T> | null> {
    try {
      const item = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (item) {
        return JSON.parse(item) as StorageItem<T>;
      }
    } catch (error) {
      console.error("Error getting cache:", error);
    }
    return null;
  }

  async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error("Error removing cache:", error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  // Check if cached data is still valid (within 5 minutes by default)
  isCacheValid(item: StorageItem, maxAge: number = 5 * 60 * 1000): boolean {
    return Date.now() - item.timestamp < maxAge;
  }

  // Pending operations management
  async addPendingOperation(
    operation: Omit<PendingOperation, "id" | "timestamp" | "retryCount">
  ): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      await AsyncStorage.setItem(
        `${this.PENDING_PREFIX}${id}`,
        JSON.stringify(pendingOp)
      );
      return id;
    } catch (error) {
      console.error("Error adding pending operation:", error);
      throw error;
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = keys.filter((key) =>
        key.startsWith(this.PENDING_PREFIX)
      );

      if (pendingKeys.length === 0) return [];

      const items = await AsyncStorage.multiGet(pendingKeys);
      return items
        .map(([_, value]) =>
          value ? (JSON.parse(value) as PendingOperation) : null
        )
        .filter((op): op is PendingOperation => op !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error("Error getting pending operations:", error);
      return [];
    }
  }

  async removePendingOperation(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.PENDING_PREFIX}${id}`);
    } catch (error) {
      console.error("Error removing pending operation:", error);
    }
  }

  async updatePendingOperation(
    id: string,
    updates: Partial<PendingOperation>
  ): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(
        `${this.PENDING_PREFIX}${id}`
      );
      if (existing) {
        const operation = JSON.parse(existing) as PendingOperation;
        const updated = { ...operation, ...updates };
        await AsyncStorage.setItem(
          `${this.PENDING_PREFIX}${id}`,
          JSON.stringify(updated)
        );
      }
    } catch (error) {
      console.error("Error updating pending operation:", error);
    }
  }

  async clearPendingOperations(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = keys.filter((key) =>
        key.startsWith(this.PENDING_PREFIX)
      );
      await AsyncStorage.multiRemove(pendingKeys);
    } catch (error) {
      console.error("Error clearing pending operations:", error);
    }
  }

  // Metadata management (for sync timestamps, versions, etc.)
  async setMetadata(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.METADATA_PREFIX}${key}`,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error("Error setting metadata:", error);
    }
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(`${this.METADATA_PREFIX}${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error getting metadata:", error);
      return null;
    }
  }

  // Secure storage for sensitive data
  async setSecure(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("Error setting secure item:", error);
    }
  }

  async getSecure(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("Error getting secure item:", error);
      return null;
    }
  }

  async removeSecure(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error removing secure item:", error);
    }
  }
}

export const storage = StorageManager.getInstance();
