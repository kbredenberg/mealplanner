import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3001", "http://localhost:8081"], // Web and mobile dev servers
    credentials: true,
  })
);

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Health check
app.get("/", (c) => {
  return c.json({ message: "Meal Planner API is running!" });
});

// API routes placeholder
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

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 Server is running on http://localhost:${info.port}`);
    console.log(`📊 Health check: http://localhost:${info.port}/api/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${info.port}/api/auth/*`);
  }
);
