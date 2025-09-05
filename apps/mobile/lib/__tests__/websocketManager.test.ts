import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wsManager } from "../websocketManager";

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// Mock global WebSocket
global.WebSocket = vi.fn(() => mockWebSocket) as any;

describe("WebSocket Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsManager.disconnect(); // Ensure clean state
  });

  afterEach(() => {
    wsManager.disconnect();
  });

  it("should set base URL correctly", () => {
    const baseUrl = "http://localhost:3000";
    wsManager.setBaseUrl(baseUrl);

    // Base URL is set internally, we can test by trying to connect
    expect(() => wsManager.setBaseUrl(baseUrl)).not.toThrow();
  });

  it("should handle connection status", () => {
    const status = wsManager.getConnectionStatus();

    expect(status).toHaveProperty("isConnected");
    expect(status).toHaveProperty("reconnectAttempts");
    expect(status).toHaveProperty("subscribedHouseholds");
    expect(typeof status.isConnected).toBe("boolean");
    expect(typeof status.reconnectAttempts).toBe("number");
    expect(Array.isArray(status.subscribedHouseholds)).toBe(true);
  });

  it("should manage household subscriptions", () => {
    const householdId = "test-household-123";

    // Subscribe to household
    wsManager.subscribeToHousehold(householdId);

    const status = wsManager.getConnectionStatus();
    expect(status.subscribedHouseholds).toContain(householdId);

    // Unsubscribe from household
    wsManager.unsubscribeFromHousehold(householdId);

    const statusAfter = wsManager.getConnectionStatus();
    expect(statusAfter.subscribedHouseholds).not.toContain(householdId);
  });

  it("should handle event subscription and unsubscription", () => {
    const eventHandler = vi.fn();
    const eventType = "inventory:updated";

    // Subscribe to event
    wsManager.on(eventType, eventHandler);

    // Unsubscribe from event
    wsManager.off(eventType, eventHandler);

    // Should not throw errors
    expect(true).toBe(true);
  });

  it("should reject connection without base URL", async () => {
    try {
      await wsManager.connect();
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Base URL not set");
    }
  });

  it("should handle disconnect gracefully", () => {
    expect(() => wsManager.disconnect()).not.toThrow();
  });
});
