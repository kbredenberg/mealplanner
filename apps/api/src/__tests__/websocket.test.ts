import { describe, it, expect } from "vitest";
import { wsManager } from "../lib/websocket.js";

describe("WebSocket Integration", () => {
  it("should handle WebSocket manager stats", () => {
    // Test the WebSocket manager methods
    const stats = wsManager.getStats();
    expect(stats).toHaveProperty("totalClients");
    expect(stats).toHaveProperty("householdSubscriptions");
    expect(stats.totalClients).toBe(0);
    expect(Array.isArray(stats.householdSubscriptions)).toBe(true);
  });

  it("should broadcast messages to household subscribers", () => {
    // Test the broadcast functionality without actual WebSocket connections
    const householdId = "test-household-id";
    const eventType = "inventory:updated";
    const eventData = {
      householdId,
      item: {
        id: "test-item",
        name: "Test Item",
        quantity: 5,
        unit: "pieces",
        category: "Test Category",
      },
    };

    // This should not throw an error even with no subscribers
    expect(() => {
      wsManager.broadcastToHousehold(householdId, eventType, eventData);
    }).not.toThrow();
  });
});
