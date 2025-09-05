# WebSocket Integration Documentation

## Overview

The meal planner application now includes comprehensive real-time WebSocket integration for collaborative features. This enables instant synchronization of data changes across all connected household members.

## Architecture

### Server-Side (Hono API)

The WebSocket server is implemented in `apps/api/src/lib/websocket.ts` and provides:

- **Authentication**: All WebSocket connections require valid Better Auth sessions
- **Household Subscriptions**: Clients can subscribe to specific household updates
- **Event Broadcasting**: Server broadcasts events to all subscribed clients
- **Connection Management**: Automatic cleanup of disconnected clients
- **Heartbeat/Ping-Pong**: Keep-alive mechanism to detect dead connections

### Client-Side (React Native)

The WebSocket client is implemented with:

- **Centralized Manager**: `apps/mobile/lib/websocketManager.ts` handles all WebSocket operations
- **React Hook**: `apps/mobile/hooks/useWebSocket.ts` provides easy integration with React components
- **Context Integration**: All data contexts (Inventory, Shopping List, Meal Plan) use WebSocket events
- **Automatic Reconnection**: Exponential backoff reconnection strategy
- **Connection Management**: Graceful handling of network changes

## WebSocket Events

### Inventory Events

- `inventory:updated`: Fired when inventory items are created, updated, or deleted
  ```typescript
  {
    householdId: string;
    item: InventoryItem;
  }
  ```

### Shopping List Events

- `shopping-list:item-added`: New item added to shopping list
- `shopping-list:item-updated`: Item details updated
- `shopping-list:item-completed`: Item marked as completed/uncompleted
- `shopping-list:item-deleted`: Item removed from list
- `shopping-list:bulk-operation`: Multiple items affected

### Meal Plan Events

- `meal-plan:updated`: Meal plan changes with action type
  ```typescript
  {
    householdId: string;
    mealPlanId: string;
    meal?: MealPlanItem;
    mealId?: string;
    action: "added" | "updated" | "deleted" | "cooked";
  }
  ```

### Household Events

- `household:member-joined`: New member added to household

## Usage Examples

### Basic WebSocket Connection

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { isConnected, connect, disconnect } = useWebSocket({
    householdId: 'household-123',
    autoConnect: true
  });

  return (
    <View>
      <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
    </View>
  );
}
```

### Listening to Events

```typescript
import { useWebSocketEvent } from '@/hooks/useWebSocket';

function InventoryComponent() {
  useWebSocketEvent('inventory:updated', (data) => {
    console.log('Inventory updated:', data.item);
    // Update local state
  }, []);

  return <InventoryList />;
}
```

### Context Integration

The contexts automatically handle WebSocket events:

```typescript
// In InventoryContext
useWebSocketEvent(
  "inventory:updated",
  (data) => {
    if (data.householdId === currentHousehold?.id) {
      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === data.item.id
        );
        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prev];
          updated[existingIndex] = data.item;
          return updated;
        } else {
          // Add new item
          return [data.item, ...prev];
        }
      });
    }
  },
  [currentHousehold?.id]
);
```

## Connection Management

### Automatic Reconnection

The WebSocket manager implements exponential backoff reconnection:

- Initial delay: 3 seconds
- Maximum attempts: 5
- Exponential backoff: delay × 2^attempt

### Heartbeat

- Ping sent every 30 seconds
- Server responds with pong
- Connection considered dead if no response

### Household Subscriptions

Clients automatically subscribe to their current household and unsubscribe when switching households.

## Error Handling

### Connection Errors

- Authentication failures result in immediate connection closure
- Network errors trigger automatic reconnection
- Invalid messages are logged and ignored

### Fallback Behavior

When WebSocket is disconnected:

- Contexts fall back to polling/reload mechanisms
- Optimistic updates still work for offline scenarios
- Data synchronization occurs when connection is restored

## Testing

### Server Tests

Located in `apps/api/src/__tests__/websocket.test.ts`:

- WebSocket manager functionality
- Event broadcasting
- Connection statistics

### Client Tests

Located in `apps/mobile/lib/__tests__/websocketManager.test.ts`:

- Connection management
- Event subscription/unsubscription
- Household subscription handling

## Performance Considerations

### Message Filtering

- Events are only sent to clients subscribed to the relevant household
- No unnecessary network traffic to unrelated clients

### Connection Pooling

- Server maintains efficient connection pools
- Automatic cleanup of dead connections
- Memory-efficient client tracking

### Bandwidth Optimization

- Only essential data is sent in events
- Minimal message overhead
- Efficient JSON serialization

## Security

### Authentication

- All WebSocket connections require valid Better Auth sessions
- Session validation on connection and message handling
- Automatic disconnection for invalid sessions

### Authorization

- Clients can only subscribe to households they're members of
- Server validates household access for all operations
- No cross-household data leakage

### Data Validation

- All incoming messages are validated
- Invalid messages are rejected and logged
- Protection against malicious payloads

## Monitoring and Debugging

### Connection Statistics

```typescript
const stats = wsManager.getStats();
console.log("Total clients:", stats.totalClients);
console.log("Household subscriptions:", stats.householdSubscriptions);
```

### Debug Logging

- Connection events logged to console
- Message handling errors logged
- Reconnection attempts tracked

### Health Checks

The API provides WebSocket health information at `/api/health` endpoint.

## Future Enhancements

### Planned Features

1. **Message Queuing**: Queue messages for offline clients
2. **Presence Indicators**: Show which household members are online
3. **Typing Indicators**: Real-time typing status for collaborative editing
4. **Push Notifications**: Integration with mobile push notifications
5. **Message History**: Store and replay recent events for new connections

### Performance Optimizations

1. **Message Batching**: Batch multiple events into single messages
2. **Compression**: Implement message compression for large payloads
3. **Connection Pooling**: Advanced connection management strategies
4. **Load Balancing**: Support for multiple WebSocket server instances

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if API server is running and WebSocket endpoint is accessible
2. **Authentication Errors**: Verify Better Auth session is valid
3. **No Events Received**: Ensure client is subscribed to correct household
4. **Frequent Disconnections**: Check network stability and firewall settings

### Debug Steps

1. Check browser/app console for WebSocket errors
2. Verify API server logs for connection attempts
3. Test WebSocket endpoint directly with tools like wscat
4. Validate household membership and permissions

## Configuration

### Environment Variables

- `PORT`: API server port (default: 3000)
- WebSocket server runs on same port as HTTP server

### Client Configuration

```typescript
// Set base URL for WebSocket connections
wsManager.setBaseUrl("http://localhost:3000");

// Connect with options
const { isConnected } = useWebSocket({
  householdId: "household-123",
  autoConnect: true,
});
```
