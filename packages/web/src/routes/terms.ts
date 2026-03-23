import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.ts";
import { termsPage, termsAcceptPage } from "../templates/pages.ts";
import * as userQueries from "../../../shared/src/db/queries/users.ts";
import type { User } from "../../../shared/src/types.ts";

const terms = new Hono();

// Public — accessible by anyone
terms.get("/", (c) => c.html(termsPage()));

// Authenticated — accept ToS flow
terms.get("/accept", authMiddleware, (c) => {
  const user = c.get("user" as never) as User;
  return c.html(termsAcceptPage(user));
});

terms.post("/accept", authMiddleware, async (c) => {
  const user = c.get("user" as never) as User;
  await userQueries.acceptTos(user.id);
  return c.redirect("/dashboard");
});

export default terms;
