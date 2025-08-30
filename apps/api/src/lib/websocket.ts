import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { validateSession } from "./auth.js";
import type { User } from "./auth.js";

// WebSocket event types
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

interface AuthenticatedWebSocket extends WebSocket {
  user?: User;
  householdIds?: Set<string>;
}

interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private householdSubscriptions: Map<string, Set<string>> = new Map(); // householdId -> Set of client IDs

  initialize(server: any) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      verifyClient: async (info: any) => {
        try {
          // Extract headers for authentication
          const headers = new Headers();
          Object.entries(info.req.headers).forEach(([key, value]) => {
            const headerValue = Array.isArray(value) ? value[0] : value;
            if (headerValue) {
              headers.set(key.toLowerCase(), headerValue);
            }
          });

          const session = await validateSession(headers);
          return !!(session && session.user);
        } catch (error) {
          console.error("WebSocket authentication error:", error);
          return false;
        }
      },
    });

    this.wss.on(
      "connection",
      async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
        try {
          // Re-authenticate the user for this connection
          const headers = new Headers();
          Object.entries(req.headers).forEach(([key, value]) => {
            const headerValue = Array.isArray(value) ? value[0] : value;
            if (headerValue) {
              headers.set(key.toLowerCase(), headerValue);
            }
          });

          const session = await validateSession(headers);
          if (!session || !session.user) {
            ws.close(1008, "Authentication failed");
            return;
          }

          // Set up authenticated WebSocket
          ws.user = session.user;
          ws.householdIds = new Set();

          const clientId = this.generateClientId();
          this.clients.set(clientId, ws);

          console.log(
            `WebSocket client connected: ${session.user.email} (${clientId})`
          );

          // Handle incoming messages
          ws.on("message", (data) => {
            try {
              const message = JSON.parse(data.toString()) as {
                type: string;
                householdId?: string;
              };

              this.handleClientMessage(clientId, ws, message);
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Invalid message format",
                })
              );
            }
          });

          // Handle client disconnect
          ws.on("close", () => {
            this.handleClientDisconnect(clientId);
          });

          // Send welcome message
          ws.send(
            JSON.stringify({
              type: "connected",
              message: "WebSocket connection established",
            })
          );
        } catch (error) {
          console.error("Error setting up WebSocket connection:", error);
          ws.close(1011, "Server error");
        }
      }
    );

    console.log("WebSocket server initialized on /ws");
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleClientMessage(
    clientId: string,
    ws: AuthenticatedWebSocket,
    message: { type: string; householdId?: string }
  ) {
    switch (message.type) {
      case "subscribe-household":
        if (message.householdId && ws.user) {
          await this.subscribeToHousehold(clientId, ws, message.householdId);
        }
        break;

      case "unsubscribe-household":
        if (message.householdId) {
          this.unsubscribeFromHousehold(clientId, message.householdId);
        }
        break;

      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${message.type}`,
          })
        );
    }
  }

  private async subscribeToHousehold(
    clientId: string,
    ws: AuthenticatedWebSocket,
    householdId: string
  ) {
    if (!ws.user) return;

    try {
      // Verify user has access to this household
      const { prisma } = await import("./prisma.js");
      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: ws.user.id,
            householdId: householdId,
          },
        },
      });

      if (!membership) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Access denied to household",
          })
        );
        return;
      }

      // Add to household subscription
      if (!this.householdSubscriptions.has(householdId)) {
        this.householdSubscriptions.set(householdId, new Set());
      }
      this.householdSubscriptions.get(householdId)!.add(clientId);
      ws.householdIds!.add(householdId);

      ws.send(
        JSON.stringify({
          type: "subscribed",
          householdId: householdId,
        })
      );

      console.log(`Client ${clientId} subscribed to household ${householdId}`);
    } catch (error) {
      console.error("Error subscribing to household:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to subscribe to household",
        })
      );
    }
  }

  private unsubscribeFromHousehold(clientId: string, householdId: string) {
    const subscription = this.householdSubscriptions.get(householdId);
    if (subscription) {
      subscription.delete(clientId);
      if (subscription.size === 0) {
        this.householdSubscriptions.delete(householdId);
      }
    }

    const client = this.clients.get(clientId);
    if (client && client.householdIds) {
      client.householdIds.delete(householdId);
    }

    console.log(
      `Client ${clientId} unsubscribed from household ${householdId}`
    );
  }

  private handleClientDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.householdIds) {
      // Remove from all household subscriptions
      for (const householdId of client.householdIds) {
        this.unsubscribeFromHousehold(clientId, householdId);
      }
    }

    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  // Broadcast event to all clients subscribed to a household
  broadcastToHousehold<T extends WebSocketEventType>(
    householdId: string,
    eventType: T,
    data: WebSocketEvents[T]
  ) {
    const subscription = this.householdSubscriptions.get(householdId);
    if (!subscription || subscription.size === 0) {
      return; // No subscribers
    }

    const message = JSON.stringify({
      type: eventType,
      data: data,
    });

    let sentCount = 0;
    for (const clientId of subscription) {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
          // Remove dead connection
          this.handleClientDisconnect(clientId);
        }
      }
    }

    console.log(
      `Broadcasted ${eventType} to ${sentCount} clients in household ${householdId}`
    );
  }

  // Get connection stats
  getStats() {
    return {
      totalClients: this.clients.size,
      householdSubscriptions: Array.from(
        this.householdSubscriptions.entries()
      ).map(([householdId, clients]) => ({
        householdId,
        subscriberCount: clients.size,
      })),
    };
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
