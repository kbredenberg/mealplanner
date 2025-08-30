import { betterAuth } from "better-auth/react";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const authClient = betterAuth({
  baseURL: API_BASE_URL,
  plugins: [],
  fetchOptions: {
    onError(context) {
      console.error("Auth request failed:", context.error);
    },
    onRequest(context) {
      // Add any request interceptors here if needed
      console.log("Auth request:", context.url);
    },
    onSuccess(context) {
      console.log("Auth request successful:", context.url);
    },
  },
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
