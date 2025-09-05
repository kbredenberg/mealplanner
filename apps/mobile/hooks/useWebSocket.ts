import { useEffect, useState, useCallback } from "react";
import {
  wsManager,
  WebSocketEventType,
  WebSocketEvents,
} from "../lib/websocketManager";
import { useApi } from "./useApi";

interface UseWebSocketOptions {
  householdId?: string;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { householdId, autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const api = useApi();

  // Initialize WebSocket manager with base URL
  useEffect(() => {
    wsManager.setBaseUrl(api.getBaseUrl());
  }, [api]);

  // Connect/disconnect based on household
  useEffect(() => {
    if (!autoConnect) return;

    const connect = async () => {
      try {
        setConnectionError(null);
        await wsManager.connect();
        setIsConnected(true);

        if (householdId) {
          wsManager.subscribeToHousehold(householdId);
        }
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        setConnectionError(
          error instanceof Error ? error.message : "Connection failed"
        );
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (householdId) {
        wsManager.unsubscribeFromHousehold(householdId);
      }
    };
  }, [householdId, autoConnect]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const status = wsManager.getConnectionStatus();
      setIsConnected(status.isConnected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionError(null);
      await wsManager.connect();
      setIsConnected(true);
    } catch (error) {
      console.error("Manual WebSocket connection failed:", error);
      setConnectionError(
        error instanceof Error ? error.message : "Connection failed"
      );
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setIsConnected(false);
  }, []);

  const subscribeToHousehold = useCallback((householdId: string) => {
    wsManager.subscribeToHousehold(householdId);
  }, []);

  const unsubscribeFromHousehold = useCallback((householdId: string) => {
    wsManager.unsubscribeFromHousehold(householdId);
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribeToHousehold,
    unsubscribeFromHousehold,
    wsManager,
  };
}

// Hook for subscribing to specific WebSocket events
export function useWebSocketEvent<T extends WebSocketEventType>(
  eventType: T,
  handler: (data: WebSocketEvents[T]) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    wsManager.on(eventType, handler);

    return () => {
      wsManager.off(eventType, handler);
    };
  }, dependencies);
}
