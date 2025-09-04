import { serve } from "@hono/node-server";
import { createServer } from "http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/user.js";
import { householdRoutes } from "./routes/households.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { shoppingListRoutes } from "./routes/shopping-list.js";
import { recipeRoutes } from "./routes/recipes.js";
import { mealPlanRoutes } from "./routes/meal-plans.js";
import { wsManager } from "./lib/websocket.js";
import { errorHandler } from "./lib/error-handler.js";
import "./lib/hono-types.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3001", // Web dev server
      "http://localhost:8081", // Mobile dev server
      "exp://localhost:8081", // Expo dev server
    ],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Better Auth routes (handles /api/auth/sign-in, /api/auth/sign-up, etc.)
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Custom auth routes
app.route("/api/auth", authRoutes);

// User management routes
app.route("/api/user", userRoutes);

// Household management routes
app.route("/api/households", householdRoutes);

// Inventory management routes
app.route("/api/households", inventoryRoutes);

// Shopping list management routes
app.route("/api/households", shoppingListRoutes);

// Recipe management routes
app.route("/api/recipes", recipeRoutes);

// Meal planning routes
app.route("/api/households", mealPlanRoutes);

// Health check
app.get("/", (c) => {
  return c.json({ message: "Meal Planner API is running!" });
});

// API health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      auth: "configured",
    },
  });
});

// Global error handler (must be last)
app.onError(errorHandler());

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Create HTTP server for both Hono and WebSocket
const server = createServer();

// Initialize WebSocket server
wsManager.initialize(server);

serve(
  {
    fetch: app.fetch,
    port,
    createServer: () => server,
  },
  (info) => {
    console.log(`🚀 Server is running on http://localhost:${info.port}`);
    console.log(`📊 Health check: http://localhost:${info.port}/api/health`);
    console.log(`🔐 Better Auth: http://localhost:${info.port}/api/auth/*`);
    console.log(`👤 User routes: http://localhost:${info.port}/api/user/*`);
    console.log(
      `🏠 Household routes: http://localhost:${info.port}/api/households/*`
    );
    console.log(
      `📦 Inventory routes: http://localhost:${info.port}/api/households/:id/inventory/*`
    );
    console.log(
      `🛒 Shopping list routes: http://localhost:${info.port}/api/households/:id/shopping-list/*`
    );
    console.log(
      `🍳 Recipe routes: http://localhost:${info.port}/api/recipes/*`
    );
    console.log(
      `📅 Meal plan routes: http://localhost:${info.port}/api/households/:id/meal-plans/*`
    );
    console.log(`🔌 WebSocket server: ws://localhost:${info.port}/ws`);
  }
);
