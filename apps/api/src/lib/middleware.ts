import { Context, Next } from "hono";
import { auth } from "./auth";

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.header(),
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Add session and user to context
  c.set("session", session.session);
  c.set("user", session.user);

  await next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.header(),
  });

  if (session) {
    c.set("session", session.session);
    c.set("user", session.user);
  }

  await next();
}
