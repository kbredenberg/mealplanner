import { storage } from "./storage";

export interface SyncConflict<T = any> {
  id: string;
  type: "inventory" | "shopping-list" | "meal-plan" | "recipe";
  localData: T;
  serverData: T;
  lastSyncTimestamp: number;
  localTimestamp: number;
  serverTimestamp: number;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  synced: number;
  failed: number;
}

export type ConflictResolutionStrategy =
  | "server-wins"
  | "client-wins"
  | "merge"
  | "manual";

class SyncManager {
  private static instance: SyncManager;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async getLastSyncTimestamp(
    householdId: string,
    dataType: string
  ): Promise<number> {
    const key = `last_sync_${householdId}_${dataType}`;
    const timestamp = await storage.getMetadata<number>(key);
    return timestamp || 0;
  }

  async setLastSyncTimestamp(
    householdId: string,
    dataType: string,
    timestamp: number
  ): Promise<void> {
    const key = `last_sync_${householdId}_${dataType}`;
    await storage.setMetadata(key, timestamp);
  }

  async detectConflicts<T extends { id: string; updatedAt: string }>(
    localData: T[],
    serverData: T[],
    householdId: string,
    dataType: string
  ): Promise<SyncConflict<T>[]> {
    const conflicts: SyncConflict<T>[] = [];
    const lastSyncTimestamp = await this.getLastSyncTimestamp(
      householdId,
      dataType
    );

    // Create maps for efficient lookup
    const localMap = new Map(localData.map((item) => [item.id, item]));
    const serverMap = new Map(serverData.map((item) => [item.id, item]));

    // Check for conflicts in items that exist in both local and server
    for (const [id, localItem] of localMap) {
      const serverItem = serverMap.get(id);

      if (serverItem) {
        const localTimestamp = new Date(localItem.updatedAt).getTime();
        const serverTimestamp = new Date(serverItem.updatedAt).getTime();

        // If both were modified after last sync, we have a conflict
        if (
          localTimestamp > lastSyncTimestamp &&
          serverTimestamp > lastSyncTimestamp
        ) {
          // Only consider it a conflict if the timestamps are different
          if (Math.abs(localTimestamp - serverTimestamp) > 1000) {
            // 1 second tolerance
            conflicts.push({
              id,
              type: dataType as any,
              localData: localItem,
              serverData: serverItem,
              lastSyncTimestamp,
              localTimestamp,
              serverTimestamp,
            });
          }
        }
      }
    }

    return conflicts;
  }

  async resolveConflict<T>(
    conflict: SyncConflict<T>,
    strategy: ConflictResolutionStrategy,
    customResolver?: (local: T, server: T) => T
  ): Promise<T> {
    switch (strategy) {
      case "server-wins":
        return conflict.serverData;

      case "client-wins":
        return conflict.localData;

      case "merge":
        if (customResolver) {
          return customResolver(conflict.localData, conflict.serverData);
        }
        // Default merge strategy: use server data but preserve local changes where possible
        return this.defaultMerge(conflict.localData, conflict.serverData);

      case "manual":
        // This should be handled by the UI - return server data as default
        return conflict.serverData;

      default:
        return conflict.serverData;
    }
  }

  private defaultMerge<T>(local: T, server: T): T {
    // Simple merge strategy: combine objects, preferring server values for conflicts
    if (
      typeof local === "object" &&
      typeof server === "object" &&
      local !== null &&
      server !== null
    ) {
      return { ...local, ...server };
    }
    return server;
  }

  // Specific merge strategies for different data types
  mergeInventoryItem(local: any, server: any): any {
    return {
      ...server,
      // Prefer local quantity if it was updated more recently
      quantity:
        local.updatedAt > server.updatedAt ? local.quantity : server.quantity,
      // Merge notes if both exist
      notes:
        local.notes && server.notes
          ? `${local.notes}; ${server.notes}`
          : local.notes || server.notes,
    };
  }

  mergeShoppingListItem(local: any, server: any): any {
    return {
      ...server,
      // Prefer completed status from the most recent update
      completed:
        local.updatedAt > server.updatedAt ? local.completed : server.completed,
      // Prefer local quantity if it was updated more recently
      quantity:
        local.updatedAt > server.updatedAt ? local.quantity : server.quantity,
    };
  }

  mergeMealPlanItem(local: any, server: any): any {
    return {
      ...server,
      // Prefer local cooked status if it was updated more recently
      cooked: local.updatedAt > server.updatedAt ? local.cooked : server.cooked,
      cookedAt:
        local.updatedAt > server.updatedAt ? local.cookedAt : server.cookedAt,
      // Merge notes
      notes:
        local.notes && server.notes
          ? `${local.notes}; ${server.notes}`
          : local.notes || server.notes,
    };
  }

  mergeRecipe(local: any, server: any): any {
    return {
      ...server,
      // Prefer local changes for content if updated more recently
      ...(local.updatedAt > server.updatedAt
        ? {
            name: local.name,
            description: local.description,
            instructions: local.instructions,
            ingredients: local.ingredients,
          }
        : {}),
    };
  }

  async syncData<T extends { id: string; updatedAt: string }>(
    localData: T[],
    serverData: T[],
    householdId: string,
    dataType: string,
    strategy: ConflictResolutionStrategy = "server-wins"
  ): Promise<SyncResult> {
    const conflicts = await this.detectConflicts(
      localData,
      serverData,
      householdId,
      dataType
    );
    const resolvedData: T[] = [];
    let synced = 0;
    let failed = 0;

    // Resolve conflicts
    for (const conflict of conflicts) {
      try {
        let customResolver;

        // Use specific merge strategies based on data type
        switch (dataType) {
          case "inventory":
            customResolver = this.mergeInventoryItem;
            break;
          case "shopping-list":
            customResolver = this.mergeShoppingListItem;
            break;
          case "meal-plan":
            customResolver = this.mergeMealPlanItem;
            break;
          case "recipe":
            customResolver = this.mergeRecipe;
            break;
        }

        const resolved = await this.resolveConflict(
          conflict,
          strategy,
          customResolver
        );
        resolvedData.push(resolved);
        synced++;
      } catch (error) {
        console.error("Failed to resolve conflict:", error);
        failed++;
      }
    }

    // Update last sync timestamp
    await this.setLastSyncTimestamp(householdId, dataType, Date.now());

    return {
      success: failed === 0,
      conflicts: strategy === "manual" ? conflicts : [],
      synced,
      failed,
    };
  }

  async clearSyncData(householdId: string): Promise<void> {
    const dataTypes = ["inventory", "shopping-list", "meal-plan", "recipe"];

    for (const dataType of dataTypes) {
      const key = `last_sync_${householdId}_${dataType}`;
      await storage.setMetadata(key, 0);
    }
  }

  // Generate optimistic ID for offline operations
  generateOptimisticId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if an ID is optimistic (temporary)
  isOptimisticId(id: string): boolean {
    return id.startsWith("temp_");
  }

  // Map optimistic IDs to real IDs after sync
  async mapOptimisticId(optimisticId: string, realId: string): Promise<void> {
    const key = `id_mapping_${optimisticId}`;
    await storage.setMetadata(key, realId);
  }

  async getRealId(optimisticId: string): Promise<string | null> {
    if (!this.isOptimisticId(optimisticId)) {
      return optimisticId;
    }

    const key = `id_mapping_${optimisticId}`;
    return await storage.getMetadata<string>(key);
  }
}

export const syncManager = SyncManager.getInstance();
