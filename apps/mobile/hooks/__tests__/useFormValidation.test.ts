import { renderHook, act } from "@testing-library/react-native";
import { z } from "zod";
import { useFormValidation } from "../useFormValidation";

const testSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

type TestFormData = z.infer<typeof testSchema>;

describe("useFormValidation", () => {
  it("initializes with empty values and no errors", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    expect(result.current.values).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it("initializes with provided initial values", () => {
    const onSubmit = jest.fn();
    const initialValues = { email: "test@example.com" };

    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
        initialValues,
      })
    );

    expect(result.current.values).toEqual(initialValues);
  });

  it("updates values when setValue is called", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    act(() => {
      result.current.setValue("email", "test@example.com");
    });

    expect(result.current.values.email).toBe("test@example.com");
  });

  it("clears error when setValue is called for a field with error", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set an error
    act(() => {
      result.current.setError("email", "Test error");
    });

    expect(result.current.errors.email).toBe("Test error");

    // Set value should clear the error
    act(() => {
      result.current.setValue("email", "test@example.com");
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it("validates individual fields correctly", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set invalid email
    act(() => {
      result.current.setValue("email", "invalid-email");
    });

    // Validate field
    act(() => {
      const isValid = result.current.validateField("email");
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.email).toBe("Invalid email");

    // Set valid email
    act(() => {
      result.current.setValue("email", "test@example.com");
    });

    // Validate field
    act(() => {
      const isValid = result.current.validateField("email");
      expect(isValid).toBe(true);
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it("validates entire form correctly", () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set invalid data
    act(() => {
      result.current.setValues({
        email: "invalid-email",
        password: "short",
        name: "",
      });
    });

    // Validate form
    act(() => {
      const isValid = result.current.validateForm();
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.email).toBe("Invalid email");
    expect(result.current.errors.password).toBe(
      "Password must be at least 8 characters"
    );
    expect(result.current.errors.name).toBe("Name is required");

    // Set valid data
    act(() => {
      result.current.setValues({
        email: "test@example.com",
        password: "password123",
        name: "John Doe",
      });
    });

    // Validate form
    act(() => {
      const isValid = result.current.validateForm();
      expect(isValid).toBe(true);
    });

    expect(result.current.errors).toEqual({});
  });

  it("handles form submission correctly", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set valid data
    act(() => {
      result.current.setValues({
        email: "test@example.com",
        password: "password123",
        name: "John Doe",
      });
    });

    // Submit form
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      name: "John Doe",
    });
  });

  it("does not submit form with invalid data", async () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set invalid data
    act(() => {
      result.current.setValue("email", "invalid-email");
    });

    // Submit form
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBe("Invalid email");
  });

  it("handles submission errors correctly", async () => {
    const error = new Error("Submission failed");
    const onSubmit = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
      })
    );

    // Set valid data
    act(() => {
      result.current.setValues({
        email: "test@example.com",
        password: "password123",
        name: "John Doe",
      });
    });

    // Submit form and expect error to be thrown
    await act(async () => {
      await expect(result.current.handleSubmit()).rejects.toThrow(
        "Submission failed"
      );
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("resets form correctly", () => {
    const onSubmit = jest.fn();
    const initialValues = { email: "initial@example.com" };

    const { result } = renderHook(() =>
      useFormValidation<TestFormData>({
        schema: testSchema,
        onSubmit,
        initialValues,
      })
    );

    // Modify values and add errors
    act(() => {
      result.current.setValue("email", "modified@example.com");
      result.current.setError("password", "Test error");
    });

    expect(result.current.values.email).toBe("modified@example.com");
    expect(result.current.errors.password).toBe("Test error");

    // Reset form
    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });
});
