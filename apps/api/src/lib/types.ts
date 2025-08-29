export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string; // Error code for client handling
  details?: Record<string, any>; // Additional details
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string[]>; // Validation errors
  code?: string; // Error code for client handling
}

// Auth-related types
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends AuthUser {
  households: {
    id: string;
    name: string;
    description: string | null;
    role: "ADMIN" | "MEMBER";
    joinedAt: Date;
  }[];
}

// Household-related types
export interface HouseholdContext {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
}

export type HouseholdRole = "ADMIN" | "MEMBER";

// Request/Response types for user endpoints
export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

export interface SessionRefreshResponse {
  session: {
    id: string;
    expiresAt: Date;
    updatedAt: Date;
  };
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
  session: {
    id: string;
    expiresAt: Date;
  } | null;
}
