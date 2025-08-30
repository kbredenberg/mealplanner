import { Alert } from "react-native";

export interface AuthError {
  code: string;
  message: string;
}

export const handleAuthError = (error: any): string => {
  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.code) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return "Invalid email or password. Please try again.";
      case "USER_NOT_FOUND":
        return "No account found with this email address.";
      case "EMAIL_ALREADY_EXISTS":
        return "An account with this email already exists.";
      case "WEAK_PASSWORD":
        return "Password is too weak. Please choose a stronger password.";
      case "INVALID_EMAIL":
        return "Please enter a valid email address.";
      case "NETWORK_ERROR":
        return "Network error. Please check your connection and try again.";
      case "SERVER_ERROR":
        return "Server error. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  return "An unexpected error occurred. Please try again.";
};

export const showAuthError = (error: any, title: string = "Error") => {
  const message = handleAuthError(error);
  Alert.alert(title, message);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  return { isValid: true };
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};
