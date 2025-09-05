import { useState, useCallback } from "react";
import { z } from "zod";

interface ValidationError {
  field: string;
  message: string;
}

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  initialValues?: Partial<T>;
}

interface UseFormValidationReturn<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, message: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
  reset: () => void;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  onSubmit,
  initialValues = {},
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: message }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validateField = useCallback(
    (field: keyof T): boolean => {
      try {
        // Validate the entire form and check for errors on this specific field
        schema.parse(values);
        clearError(field);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((err) =>
            err.path.includes(field as string)
          );
          if (fieldError) {
            setError(field, fieldError.message);
            return false;
          }
          // If no error for this field, clear any existing error
          clearError(field);
          return true;
        }
        return false;
      }
    },
    [values, schema, setError, clearError]
  );

  const validateForm = useCallback(() => {
    try {
      schema.parse(values);
      clearErrors();
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".");
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [values, schema, clearErrors]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (validateForm()) {
        await onSubmit(values as T);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Handle API errors
      if (error instanceof Error) {
        const apiError = error as any;
        if (apiError.code === "VALIDATION_ERROR" && apiError.details) {
          // Set server-side validation errors
          const serverErrors: Record<string, string> = {};
          Object.entries(apiError.details).forEach(([field, messages]) => {
            serverErrors[field] = Array.isArray(messages)
              ? messages[0]
              : (messages as string);
          });
          setErrors((prev) => ({ ...prev, ...serverErrors }));
        }
      }
      throw error; // Re-throw so the component can handle it
    } finally {
      setIsSubmitting(false);
    }
  }, [values, isSubmitting, validateForm, onSubmit]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid =
    Object.keys(errors).length === 0 && Object.keys(values).length > 0;

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    validateField,
    validateForm,
    handleSubmit,
    reset,
  };
}

// Common validation schemas for the app
export const validationSchemas = {
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  householdName: z
    .string()
    .min(1, "Household name is required")
    .max(100, "Name is too long"),
  itemName: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Name is too long"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required").max(20, "Unit is too long"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category is too long"),
  recipeName: z
    .string()
    .min(1, "Recipe name is required")
    .max(100, "Name is too long"),
  instructions: z.string().min(1, "Instructions are required"),
  prepTime: z.number().int().min(0, "Prep time cannot be negative").optional(),
  cookTime: z.number().int().min(0, "Cook time cannot be negative").optional(),
  servings: z.number().int().min(1, "Servings must be at least 1").optional(),
};

// Specific form schemas
export const signInSchema = z.object({
  email: validationSchemas.email,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: validationSchemas.email,
  password: validationSchemas.password,
  name: validationSchemas.name,
});

export const createHouseholdSchema = z.object({
  name: validationSchemas.householdName,
  description: z.string().max(500, "Description is too long").optional(),
});

export const createInventoryItemSchema = z.object({
  name: validationSchemas.itemName,
  quantity: validationSchemas.quantity,
  unit: validationSchemas.unit,
  category: validationSchemas.category,
  expiryDate: z.string().optional(),
});

export const createShoppingItemSchema = z.object({
  name: validationSchemas.itemName,
  quantity: validationSchemas.quantity.optional(),
  unit: validationSchemas.unit.optional(),
  category: validationSchemas.category.optional(),
});

export const createRecipeSchema = z.object({
  name: validationSchemas.recipeName,
  description: z.string().max(500, "Description is too long").optional(),
  instructions: validationSchemas.instructions,
  prepTime: validationSchemas.prepTime,
  cookTime: validationSchemas.cookTime,
  servings: validationSchemas.servings,
  tags: z.array(z.string()).default([]),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, "Ingredient name is required"),
        quantity: z.number().min(0, "Quantity cannot be negative"),
        unit: z.string().min(1, "Unit is required"),
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one ingredient is required"),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type CreateHouseholdFormData = z.infer<typeof createHouseholdSchema>;
export type CreateInventoryItemFormData = z.infer<
  typeof createInventoryItemSchema
>;
export type CreateShoppingItemFormData = z.infer<
  typeof createShoppingItemSchema
>;
export type CreateRecipeFormData = z.infer<typeof createRecipeSchema>;
