# Authentication API Documentation

This document describes the authentication endpoints implemented for the Meal Planner API.

## Overview

The API uses Better Auth for authentication with session-based authentication. All protected endpoints require a valid session cookie or authorization header.

## Better Auth Endpoints

These endpoints are automatically provided by Better Auth:

- `POST /api/auth/sign-in` - Sign in with email/password
- `POST /api/auth/sign-up` - Create new account
- `POST /api/auth/sign-out` - Sign out (revoke session)
- `GET /api/auth/session` - Get current session info
- `POST /api/auth/callback/google` - Google OAuth callback (if configured)

## Custom Authentication Endpoints

### GET /api/auth/status

Check authentication status without requiring authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "authenticated": false,
    "user": null,
    "session": null
  }
}
```

### POST /api/auth/logout

Logout and revoke current session. Requires authentication.

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/logout-all

Logout from all devices (revoke all sessions). Requires authentication.

**Response:**

```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

### GET /api/auth/validate

Validate current session token. Requires authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "avatar": "avatar_url"
    },
    "session": {
      "id": "session_id",
      "expiresAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Token is valid"
}
```

## User Profile Endpoints

### GET /api/user/profile

Get current user profile with household memberships. Requires authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "avatar_url",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "households": [
      {
        "id": "household_id",
        "name": "My Household",
        "description": "Family household",
        "role": "ADMIN",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT /api/user/profile

Update user profile. Requires authentication.

**Request Body:**

```json
{
  "name": "New Name",
  "avatar": "new_avatar_url"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "New Name",
    "avatar": "new_avatar_url",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

### GET /api/user/session

Get detailed session information. Requires authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session_id",
      "userId": "user_id",
      "expiresAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "avatar": "avatar_url"
    }
  }
}
```

### POST /api/user/session/refresh

Refresh current session (extend expiration). Requires authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session_id",
      "expiresAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Session refreshed successfully"
}
```

### DELETE /api/user/account

Delete user account. Requires authentication and confirmation.

**Request Body:**

```json
{
  "confirm": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "additional": "error details"
  }
}
```

Common error codes:

- `UNAUTHORIZED` - Authentication required
- `SESSION_EXPIRED` - Session has expired
- `AUTH_ERROR` - Authentication failed
- `INVALID_REQUEST` - Invalid request data
- `USER_NOT_FOUND` - User not found
- `PROFILE_UPDATE_ERROR` - Failed to update profile

## Authentication Flow

1. User signs up or signs in using Better Auth endpoints
2. Better Auth creates a session and sets session cookies
3. Subsequent requests include session cookies automatically
4. Middleware validates session on protected routes
5. User and session data are available in route handlers

## Security Features

- Session-based authentication with secure cookies
- Automatic session expiration and refresh
- CORS protection for cross-origin requests
- Input validation and sanitization
- Proper error handling without information leakage
- Role-based access control for household operations
