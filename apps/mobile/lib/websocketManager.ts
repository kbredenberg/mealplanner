import { useApi } from "../hooks/useApi";

// WebSocket event types matching the server
export interface WebSocketEvents {
  "shopping-list:item-added": {
    householdId: string;
    item: any;
  };
  "shopping-list:item-updated": {
    householdId: string;
    item: any;
  };
  "shopping-list:item-deleted": {
    householdId: string;
    itemId: string;
  };
  "shopping-list:item-completed": {
    householdId: string;
    item: any;
  };
  "shopping-list:bulk-operation": {
    householdId: string;
    action: string;
    affectedCount: number;
  };
  "inventory:updated": {
    householdId: string;
    item: any;
  };
  "household:member-joined": {
    householdId: string;
    member: any;
  };
  "meal-plan:updated": {
    householdId: string;
    mealPlanId: string;
    meal?: any;
    mealId?: string;
    action: "added" | "updated" | "deleted" | "cooked";
  };
}

export type WebSocketEventType = keyof WebSocketEvents;

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

type EventHandler<T extends WebSocketEventType> = (
  data: WebSocketEvents[T]
) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private subscribedHouseholds: Set<string> = new Set();
  private baseUrl: string = "";

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Initialize event handler maps for each event type
    const eventTypes: WebSocketEventType[] = [
      "shopping-list:item-added",
      "shopping-list:item-updated",
      "shopping-list:item-deleted",
      "shopping-list:item-completed",
      "shopping-list:bulk-operation",
      "inventory:updated",
      "household:member-joined",
      "meal-plan:updated",
    ];

    eventTypes.forEach((eventType) => {
      this.eventHandlers.set(eventType, new Set());
    });
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.isConnected) {
        resolve();
        return;
      }

      if (!this.baseUrl) {
        reject(new Error("Base URL not set"));
        return;
      }

      try {
        const wsUrl = this.baseUrl
          .replace(/^http:\/\//, "ws://")
          .replace(/^https:\/\//, "wss://");
        this.ws = new WebSocket(`${wsUrl}/ws`);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startPingInterval();

          // Re-subscribe to all households
          this.subscribedHouseholds.forEach((householdId) => {
            this.subscribeToHousehold(householdId);
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.isConnected = false;
          this.stopPingInterval();

          if (event.code !== 1000) {
            // Not a normal closure
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          reject(error);
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.isConnected = false;
    this.subscribedHouseholds.clear();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    this.reconnectAttempts++;

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  private startPingInterval() {
    this.pingTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case "connected":
      case "subscribed":
        console.log("WebSocket:", message.message || message.type);
        break;

      case "pong":
        // Heartbeat response
        break;

      case "error":
        console.error("WebSocket server error:", message.message);
        break;

      default:
        // Handle event messages
        if (message.data && this.eventHandlers.has(message.type)) {
          const handlers = this.eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(message.data);
              } catch (error) {
                console.error(
                  `Error in event handler for ${message.type}:`,
                  error
                );
              }
            });
          }
        }
        break;
    }
  }

  subscribeToHousehold(householdId: string) {
    this.subscribedHouseholds.add(householdId);

    if (this.isConnected && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe-household",
          householdId: householdId,
        })
      );
    }
  }

  unsubscribeFromHousehold(householdId: string) {
    this.subscribedHouseholds.delete(householdId);

    if (this.isConnected && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: "unsubscribe-household",
          householdId: householdId,
        })
      );
    }
  }

  // Event subscription methods
  on<T extends WebSocketEventType>(eventType: T, handler: EventHandler<T>) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }
  }

  off<T extends WebSocketEventType>(eventType: T, handler: EventHandler<T>) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // Connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedHouseholds: Array.from(this.subscribedHouseholds),
    };
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
