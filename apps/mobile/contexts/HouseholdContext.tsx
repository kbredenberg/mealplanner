import React, { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

export interface Household {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  role: "ADMIN" | "MEMBER";
  memberCount: number;
}

export interface HouseholdMember {
  id: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
}

export interface HouseholdInvite {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
}

interface HouseholdContextType {
  households: Household[];
  currentHousehold: Household | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
  isLoading: boolean;
  error: string | null;

  // Household management
  loadHouseholds: () => Promise<void>;
  selectHousehold: (household: Household) => void;
  createHousehold: (data: {
    name: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateHousehold: (
    id: string,
    data: { name: string; description?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteHousehold: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Member management
  loadMembers: (householdId: string) => Promise<void>;
  inviteMember: (
    householdId: string,
    email: string,
    role?: "ADMIN" | "MEMBER"
  ) => Promise<{ success: boolean; error?: string }>;
  removeMember: (
    householdId: string,
    memberId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (
    householdId: string,
    memberId: string,
    role: "ADMIN" | "MEMBER"
  ) => Promise<{ success: boolean; error?: string }>;

  // Invite management
  loadInvites: (householdId: string) => Promise<void>;
  cancelInvite: (
    householdId: string,
    inviteId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(
  undefined
);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(
    null
  );
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();
  const { session } = useAuth();

  // Load households when user is authenticated
  useEffect(() => {
    if (session) {
      loadHouseholds();
    }
  }, [session]);

  const loadHouseholds = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get("/api/households");
      const data = await response.json();

      if (data.success) {
        setHouseholds(data.data || []);

        // If no current household is selected and we have households, select the first one
        if (!currentHousehold && data.data && data.data.length > 0) {
          setCurrentHousehold(data.data[0]);
        }
      } else {
        setError(data.error || "Failed to load households");
      }
    } catch (err) {
      setError("Failed to load households");
      console.error("Error loading households:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectHousehold = (household: Household) => {
    setCurrentHousehold(household);
    // Clear members and invites when switching households
    setMembers([]);
    setInvites([]);
  };

  const createHousehold = async (data: {
    name: string;
    description?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post("/api/households", data);
      const result = await response.json();

      if (result.success) {
        await loadHouseholds(); // Reload households to get the new one
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to create household",
        };
      }
    } catch (err) {
      console.error("Error creating household:", err);
      return { success: false, error: "Failed to create household" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateHousehold = async (
    id: string,
    data: { name: string; description?: string }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(`/api/households/${id}`, data);
      const result = await response.json();

      if (result.success) {
        await loadHouseholds(); // Reload households to get updated data
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update household",
        };
      }
    } catch (err) {
      console.error("Error updating household:", err);
      return { success: false, error: "Failed to update household" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHousehold = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(`/api/households/${id}`);
      const result = await response.json();

      if (result.success) {
        await loadHouseholds(); // Reload households
        // If we deleted the current household, clear it
        if (currentHousehold?.id === id) {
          setCurrentHousehold(null);
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to delete household",
        };
      }
    } catch (err) {
      console.error("Error deleting household:", err);
      return { success: false, error: "Failed to delete household" };
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (householdId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/api/households/${householdId}/members`);
      const data = await response.json();

      if (data.success) {
        setMembers(data.data || []);
      } else {
        setError(data.error || "Failed to load members");
      }
    } catch (err) {
      setError("Failed to load members");
      console.error("Error loading members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const inviteMember = async (
    householdId: string,
    email: string,
    role: "ADMIN" | "MEMBER" = "MEMBER"
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/api/households/${householdId}/invites`,
        { email, role }
      );
      const result = await response.json();

      if (result.success) {
        await loadInvites(householdId); // Reload invites to show the new one
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to send invitation",
        };
      }
    } catch (err) {
      console.error("Error inviting member:", err);
      return { success: false, error: "Failed to send invitation" };
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (householdId: string, memberId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(
        `/api/households/${householdId}/members/${memberId}`
      );
      const result = await response.json();

      if (result.success) {
        await loadMembers(householdId); // Reload members
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to remove member",
        };
      }
    } catch (err) {
      console.error("Error removing member:", err);
      return { success: false, error: "Failed to remove member" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (
    householdId: string,
    memberId: string,
    role: "ADMIN" | "MEMBER"
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(
        `/api/households/${householdId}/members/${memberId}`,
        { role }
      );
      const result = await response.json();

      if (result.success) {
        await loadMembers(householdId); // Reload members
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to update member role",
        };
      }
    } catch (err) {
      console.error("Error updating member role:", err);
      return { success: false, error: "Failed to update member role" };
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvites = async (householdId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/api/households/${householdId}/invites`);
      const data = await response.json();

      if (data.success) {
        setInvites(data.data || []);
      } else {
        setError(data.error || "Failed to load invites");
      }
    } catch (err) {
      setError("Failed to load invites");
      console.error("Error loading invites:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelInvite = async (householdId: string, inviteId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(
        `/api/households/${householdId}/invites/${inviteId}`
      );
      const result = await response.json();

      if (result.success) {
        await loadInvites(householdId); // Reload invites
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to cancel invitation",
        };
      }
    } catch (err) {
      console.error("Error canceling invite:", err);
      return { success: false, error: "Failed to cancel invitation" };
    } finally {
      setIsLoading(false);
    }
  };

  const value: HouseholdContextType = {
    households,
    currentHousehold,
    members,
    invites,
    isLoading,
    error,
    loadHouseholds,
    selectHousehold,
    createHousehold,
    updateHousehold,
    deleteHousehold,
    loadMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    loadInvites,
    cancelInvite,
  };

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return context;
}
