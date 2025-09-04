import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { ZodError, z } from "zod";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  ErrorCode,
  errorHandler,
  createValidationError,
  createAuthError,
  createNotFoundError,
} from "../lib/error-handler.js";

// Mock console.error
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Mock Hono Context
const createMockContext = () => {
  const mockJson = vi.fn();
  const mockReq = {
    url: "http://localhost:3000/test",
    method: "GET",
  };

  return {
    json: mockJson,
    req: mockReq,
  } as unknown as Context;
};

describe("Error Handler", () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  describe("AppError classes", () => {
    it("creates AppError with correct properties", () => {
      const error = new AppError(
        "Test error",
        400,
        ErrorCode.VALIDATION_ERROR,
        { field: "test" }
      );

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: "test" });
      expect(error.isOperational).toBe(true);
    });

    it("creates ValidationError with correct defaults", () => {
      const error = new ValidationError("Validation failed", {
        email: ["Invalid email"],
      });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ email: ["Invalid email"] });
    });

    it("creates AuthenticationError with correct defaults", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it("creates AuthorizationError with correct defaults", () => {
      const error = new AuthorizationError();

      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it("creates NotFoundError with correct defaults", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
    });

    it("creates ConflictError with correct defaults", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Resource conflict");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.CONFLICT);
    });

    it("creates BusinessLogicError with correct properties", () => {
      const error = new BusinessLogicError(
        "Insufficient inventory",
        ErrorCode.INSUFFICIENT_INVENTORY
      );

      expect(error.message).toBe("Insufficient inventory");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_INVENTORY);
    });
  });

  describe("Error handler middleware", () => {
    it("handles ZodError correctly", async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: "invalid", age: 15 });
      } catch (error) {
        zodError = error as ZodError;
      }

      const context = createMockContext();
      const handler = errorHandler();

      await handler(zodError!, context);

      expect(context.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Validation failed",
          code: ErrorCode.VALIDATION_ERROR,
          details: expect.any(Object),
        }),
        400
      );
    });

    it("handles AppError correctly", async () => {
      const error = new ValidationError("Custom validation error", {
        field: ["Error message"],
      });
      const context = createMockContext();
      const handler = errorHandler();

      await handler(error, context);

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Custom validation error",
          code: ErrorCode.VALIDATION_ERROR,
          details: { field: ["Error message"] },
        },
        400
      );
    });

    it("handles Prisma unique constraint error", async () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: { target: ["email"] },
      };

      const context = createMockContext();
      const handler = errorHandler();

      await handler(prismaError as any, context);

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Resource already exists",
          code: ErrorCode.DUPLICATE_RESOURCE,
          details: { field: ["email"] },
        },
        409
      );
    });

    it("handles Prisma not found error", async () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2025",
      };

      const context = createMockContext();
      const handler = errorHandler();

      await handler(prismaError as any, context);

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Resource not found",
          code: ErrorCode.RESOURCE_NOT_FOUND,
        },
        404
      );
    });

    it("handles unknown Prisma error", async () => {
      const prismaError = {
        name: "PrismaClientKnownRequestError",
        code: "P2000",
      };

      const context = createMockContext();
      const handler = errorHandler();

      await handler(prismaError as any, context);

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Database operation failed",
          code: ErrorCode.DATABASE_ERROR,
        },
        500
      );
    });

    it("handles unexpected errors", async () => {
      const error = new Error("Unexpected error");
      const context = createMockContext();
      const handler = errorHandler();

      await handler(error, context);

      expect(context.json).toHaveBeenCalledWith(
        {
          success: false,
          error: "Internal server error",
          code: ErrorCode.INTERNAL_ERROR,
        },
        500
      );
    });

    it("logs error information", async () => {
      const error = new Error("Test error");
      const context = createMockContext();
      const handler = errorHandler();

      await handler(error, context);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error occurred:",
        expect.objectContaining({
          message: "Test error",
          stack: expect.any(String),
          url: "http://localhost:3000/test",
          method: "GET",
        })
      );
    });
  });

  describe("Utility functions", () => {
    it("createValidationError creates ValidationError", () => {
      const error = createValidationError("Test validation", {
        field: ["Error"],
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Test validation");
      expect(error.details).toEqual({ field: ["Error"] });
    });

    it("createAuthError creates AuthenticationError", () => {
      const error = createAuthError(
        "Custom auth error",
        ErrorCode.SESSION_EXPIRED
      );

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe("Custom auth error");
      expect(error.code).toBe(ErrorCode.SESSION_EXPIRED);
    });

    it("createNotFoundError creates NotFoundError", () => {
      const error = createNotFoundError("Resource not found", "user");

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("Resource not found");
      expect(error.details).toEqual({ resource: "user" });
    });
  });
});
