import { storage } from "../storage";
import { syncManager } from "../syncManager";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock SecureStore
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe("Offline Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Storage Manager", () => {
    it("should cache data correctly", async () => {
      const testData = { id: "1", name: "Test Item", quantity: 5 };
      const key = "test_key";

      await storage.setCache(key, testData);

      // Verify setItem was called with correct parameters
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `cache_${key}`,
        expect.stringContaining(
          '"data":{"id":"1","name":"Test Item","quantity":5}'
        )
      );
    });

    it("should add pending operations", async () => {
      const operation = {
        type: "CREATE" as const,
        endpoint: "/api/test",
        data: { name: "Test" },
      };

      const id = await storage.addPendingOperation(operation);

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");

      const AsyncStorage = require("@react-native-async-storage/async-storage");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^pending_/),
        expect.stringContaining('"type":"CREATE"')
      );
    });

    it("should validate cache expiry", () => {
      const validItem = {
        data: { test: "data" },
        timestamp: Date.now() - 1000, // 1 second ago
        version: 1,
      };

      const expiredItem = {
        data: { test: "data" },
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        version: 1,
      };

      expect(storage.isCacheValid(validItem, 5 * 60 * 1000)).toBe(true);
      expect(storage.isCacheValid(expiredItem, 5 * 60 * 1000)).toBe(false);
    });
  });

  describe("Sync Manager", () => {
    it("should detect conflicts correctly", async () => {
      const localData = [
        { id: "1", name: "Local Item", updatedAt: "2023-01-02T00:00:00Z" },
      ];

      const serverData = [
        { id: "1", name: "Server Item", updatedAt: "2023-01-03T00:00:00Z" },
      ];

      const conflicts = await syncManager.detectConflicts(
        localData,
        serverData,
        "household1",
        "inventory"
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe("1");
      expect(conflicts[0].localData.name).toBe("Local Item");
      expect(conflicts[0].serverData.name).toBe("Server Item");
    });

    it("should resolve conflicts with server-wins strategy", async () => {
      const conflict = {
        id: "1",
        type: "inventory" as const,
        localData: { id: "1", name: "Local Item", quantity: 5 },
        serverData: { id: "1", name: "Server Item", quantity: 10 },
        lastSyncTimestamp: Date.now() - 1000,
        localTimestamp: Date.now(),
        serverTimestamp: Date.now() + 1000,
      };

      const resolved = await syncManager.resolveConflict(
        conflict,
        "server-wins"
      );
      expect(resolved).toEqual(conflict.serverData);
    });

    it("should resolve conflicts with client-wins strategy", async () => {
      const conflict = {
        id: "1",
        type: "inventory" as const,
        localData: { id: "1", name: "Local Item", quantity: 5 },
        serverData: { id: "1", name: "Server Item", quantity: 10 },
        lastSyncTimestamp: Date.now() - 1000,
        localTimestamp: Date.now(),
        serverTimestamp: Date.now() + 1000,
      };

      const resolved = await syncManager.resolveConflict(
        conflict,
        "client-wins"
      );
      expect(resolved).toEqual(conflict.localData);
    });

    it("should generate optimistic IDs", () => {
      const id1 = syncManager.generateOptimisticId();
      const id2 = syncManager.generateOptimisticId();

      expect(id1).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("should identify optimistic IDs", () => {
      const optimisticId = "temp_1234567890_abc123";
      const realId = "real_id_123";

      expect(syncManager.isOptimisticId(optimisticId)).toBe(true);
      expect(syncManager.isOptimisticId(realId)).toBe(false);
    });

    it("should merge inventory items correctly", () => {
      const local = {
        id: "1",
        name: "Item",
        quantity: 5,
        updatedAt: "2023-01-03T00:00:00Z",
        notes: "Local notes",
      };

      const server = {
        id: "1",
        name: "Item",
        quantity: 10,
        updatedAt: "2023-01-02T00:00:00Z",
        notes: "Server notes",
      };

      const merged = syncManager.mergeInventoryItem(local, server);

      // Should prefer local quantity since it was updated more recently
      expect(merged.quantity).toBe(5);
      // Should merge notes
      expect(merged.notes).toBe("Local notes; Server notes");
    });
  });
});
