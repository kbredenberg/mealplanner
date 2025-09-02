# Offline Support Implementation

This document describes the offline support and data synchronization features implemented for the meal planner mobile app.

## Overview

The offline support system provides:

- Local data caching for offline access
- Optimistic updates for better user experience
- Data synchronization when connectivity returns
- Conflict resolution for concurrent edits
- Pending operation queue for offline actions

## Architecture

### Core Components

1. **Storage Manager** (`lib/storage.ts`)
   - Manages local data caching using AsyncStorage
   - Handles pending operations queue
   - Provides secure storage for sensitive data

2. **Sync Manager** (`lib/syncManager.ts`)
   - Detects data conflicts between local and server
   - Provides conflict resolution strategies
   - Manages sync timestamps and metadata

3. **Offline API Hook** (`hooks/useOfflineApi.ts`)
   - Extends the base API hook with offline capabilities
   - Handles optimistic updates
   - Queues operations when offline

4. **Network Status Hook** (`hooks/useNetworkStatus.ts`)
   - Monitors network connectivity
   - Provides real-time connection status

### Enhanced Contexts

The following contexts have been enhanced with offline support:

- **InventoryContext**: Offline inventory management
- **ShoppingListContext**: Offline shopping list with real-time sync
- **MealPlanContext**: Offline meal planning

### UI Components

1. **OfflineStatusBar**: Shows connection status and pending operations
2. **ConflictResolutionModal**: Allows users to resolve data conflicts

## Features

### 1. Local Data Caching

Data is automatically cached locally when fetched from the server:

```typescript
// Cache data for 2 minutes
const response = await offlineApi.get("/api/inventory", {
  cacheKey: "inventory_household_123",
  cacheMaxAge: 2 * 60 * 1000,
});
```

### 2. Optimistic Updates

When offline, operations are applied immediately to the local state and queued for later sync:

```typescript
// Add item optimistically
const result = await offlineApi.post("/api/inventory", itemData, {
  enableOptimisticUpdates: true,
});

if (result.pending) {
  // Item was added to local state immediately
  // Will sync when connection returns
}
```

### 3. Pending Operations Queue

Operations performed while offline are queued and processed when connectivity returns:

- CREATE operations: Add new items
- UPDATE operations: Modify existing items
- DELETE operations: Remove items

### 4. Conflict Resolution

When the same data is modified both locally and on the server, conflicts are detected and can be resolved using different strategies:

- **Server Wins**: Use server version
- **Client Wins**: Use local version
- **Smart Merge**: Intelligently combine changes
- **Manual**: Let user choose

### 5. Data Synchronization

Automatic sync occurs when:

- App comes back online
- User manually triggers sync
- App is opened after being offline

## Usage Examples

### Basic Offline-Aware Data Fetching

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["inventory", householdId],
  queryFn: async () => {
    const response = await offlineApi.get(
      `/api/households/${householdId}/inventory`,
      {
        cacheKey: `inventory_${householdId}`,
        cacheMaxAge: 5 * 60 * 1000, // 5 minutes
      }
    );
    return response.json();
  },
});
```

### Optimistic Updates

```typescript
const addItem = async (itemData) => {
  try {
    const response = await offlineApi.post(
      `/api/households/${householdId}/inventory`,
      itemData,
      { enableOptimisticUpdates: true }
    );

    if (response.pending) {
      // Show user that item was added locally
      // and will sync when online
    }
  } catch (error) {
    // Handle error
  }
};
```

### Manual Sync

```typescript
const { syncData } = useInventory();

const handleSync = async () => {
  await syncData();
  // Data is now synchronized
};
```

### Conflict Resolution

```typescript
const { conflicts, resolveConflict } = useInventory();

const handleResolveConflict = async (conflictId, resolution) => {
  await resolveConflict(conflictId, resolution);
  // Conflict is resolved
};
```

## Storage Structure

### Cache Keys

- `cache_inventory_{householdId}`: Inventory data
- `cache_shopping_list_{householdId}`: Shopping list data
- `cache_meal_plan_{householdId}_{weekStart}`: Meal plan data

### Pending Operations

- `pending_{operationId}`: Queued operations

### Metadata

- `last_sync_{householdId}_{dataType}`: Last sync timestamps
- `id_mapping_{optimisticId}`: Maps temporary IDs to real IDs

## Error Handling

The system gracefully handles various error scenarios:

1. **Network Failures**: Operations are queued for later
2. **Server Errors**: Cached data is used when available
3. **Sync Conflicts**: User is prompted to resolve
4. **Storage Errors**: Fallback to memory-only operation

## Performance Considerations

- Cache expiration prevents stale data
- Optimistic updates provide immediate feedback
- Background sync minimizes user interruption
- Efficient conflict detection using timestamps

## Security

- Sensitive data uses Expo SecureStore
- Cache data is stored locally only
- Pending operations include household context for security

## Testing

The offline functionality can be tested by:

1. Turning off network connectivity
2. Performing CRUD operations
3. Turning network back on
4. Verifying data synchronization

## Future Enhancements

Potential improvements:

- Selective sync (only changed data)
- Compression for large datasets
- Background sync scheduling
- Advanced conflict resolution UI
- Offline-first architecture with eventual consistency
