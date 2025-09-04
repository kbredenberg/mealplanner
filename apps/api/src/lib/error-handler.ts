import type { Context } from "hono";
import { ZodError } from "zod";
import type { ApiResponse, ErrorResponse } from "./types.js";

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  AUTH_ERROR = "AUTH_ERROR",

  // Authorization errors
  FORBIDDEN = "FORBIDDEN",
  HOUSEHOLD_ACCESS_DENIED = "HOUSEHOLD_ACCESS_DENIED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",
  CONFLICT = "CONFLICT",

  // Business logic errors
  INSUFFICIENT_INVENTORY = "INSUFFICIENT_INVENTORY",
  RECIPE_NOT_AVAILABLE = "RECIPE_NOT_AVAILABLE",
  MEAL_ALREADY_COOKED = "MEAL_ALREADY_COOKED",
  INVALID_MEAL_PLAN = "INVALID_MEAL_PLAN",

  // System errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication required",
    code: ErrorCode = ErrorCode.UNAUTHORIZED
  ) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = "Access denied",
    code: ErrorCode = ErrorCode.FORBIDDEN
  ) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", resource?: string) {
    super(
      message,
      404,
      ErrorCode.NOT_FOUND,
      resource ? { resource } : undefined
    );
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Resource conflict",
    details?: Record<string, any>
  ) {
    super(message, 409, ErrorCode.CONFLICT, details);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, code: ErrorCode, details?: Record<string, any>) {
    super(message, 400, code, details);
  }
}

// Error handler middleware
export function errorHandler() {
  return async (err: Error, c: Context) => {
    console.error("Error occurred:", {
      message: err.message,
      stack: err.stack,
      url: c.req.url,
      method: c.req.method,
    });

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const validationDetails: Record<string, string[]> = {};
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error) => {
          const path = error.path.join(".");
          if (!validationDetails[path]) {
            validationDetails[path] = [];
          }
          validationDetails[path].push(error.message);
        });
      }

      const response: ErrorResponse = {
        success: false,
        error: "Validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details: validationDetails,
      };

      return c.json(response, 400);
    }

    // Handle custom app errors
    if (err instanceof AppError) {
      const response: ErrorResponse = {
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      };

      return c.json(response, err.statusCode);
    }

    // Handle Prisma errors
    if (err.name === "PrismaClientKnownRequestError") {
      const prismaError = err as any;

      switch (prismaError.code) {
        case "P2002": // Unique constraint violation
          const response: ErrorResponse = {
            success: false,
            error: "Resource already exists",
            code: ErrorCode.DUPLICATE_RESOURCE,
            details: { field: prismaError.meta?.target },
          };
          return c.json(response, 409);

        case "P2025": // Record not found
          const notFoundResponse: ErrorResponse = {
            success: false,
            error: "Resource not found",
            code: ErrorCode.RESOURCE_NOT_FOUND,
          };
          return c.json(notFoundResponse, 404);

        default:
          const dbErrorResponse: ErrorResponse = {
            success: false,
            error: "Database operation failed",
            code: ErrorCode.DATABASE_ERROR,
          };
          return c.json(dbErrorResponse, 500);
      }
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
      success: false,
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    };

    return c.json(response, 500);
  };
}

// Utility functions for creating common errors
export const createValidationError = (
  message: string,
  details?: Record<string, string[]>
) => {
  return new ValidationError(message, details);
};

export const createAuthError = (message?: string, code?: ErrorCode) => {
  return new AuthenticationError(message, code);
};

export const createAuthzError = (message?: string, code?: ErrorCode) => {
  return new AuthorizationError(message, code);
};

export const createNotFoundError = (message?: string, resource?: string) => {
  return new NotFoundError(message, resource);
};

export const createConflictError = (
  message?: string,
  details?: Record<string, any>
) => {
  return new ConflictError(message, details);
};

export const createBusinessError = (
  message: string,
  code: ErrorCode,
  details?: Record<string, any>
) => {
  return new BusinessLogicError(message, code, details);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (c: Context, next?: any) => {
    return Promise.resolve(fn(c, next)).catch((err) => {
      throw err; // Let the error handler middleware catch it
    });
  };
};
