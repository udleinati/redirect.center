import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { validateSession } from "../services/auth.ts";
import type { User } from "../../../shared/src/types.ts";

export type AppEnv = {
  Variables: {
    user: User;
  };
};

export async function authMiddleware(c: Context, next: Next) {
  const sessionToken = getCookie(c, "_session");

  if (!sessionToken) {
    return c.redirect("/auth/login");
  }

  const user = await validateSession(sessionToken);
  if (!user) {
    return c.redirect("/auth/login");
  }

  c.set("user" as never, user);
  await next();
}
