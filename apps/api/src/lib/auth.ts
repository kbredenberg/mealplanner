import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      avatar: {
        type: "string",
        required: false,
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-for-development",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3001", // Web app
    "http://localhost:8081", // Mobile dev server
    "exp://localhost:8081", // Expo dev server
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// Helper function to validate session and get user
export async function validateSession(headers: Headers) {
  try {
    const session = await auth.api.getSession({ headers });
    return session;
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

// Helper function to get user by ID
export async function getUserById(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}
