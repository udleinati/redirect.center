import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sendMagicLink, validateMagicLink, logout } from "../services/auth.ts";
import { loginPage, magicLinkSentPage, errorPage } from "../templates/pages.ts";

const auth = new Hono();

auth.get("/login", (c) => {
  // If already logged in, redirect to dashboard
  const session = getCookie(c, "_session");
  if (session) {
    return c.redirect("/dashboard");
  }
  return c.html(loginPage());
});

auth.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const email = (body["email"] as string)?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return c.html(loginPage("Please enter a valid email address."), 400);
  }

  try {
    await sendMagicLink(email);
    return c.html(magicLinkSentPage(email));
  } catch (error) {
    console.error("[auth] Failed to send magic link:", error);
    return c.html(loginPage("Failed to send the sign-in link. Please try again."), 500);
  }
});

auth.get("/verify", async (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.html(errorPage("Invalid Link", "The sign-in link is missing or malformed."), 400);
  }

  const sessionToken = await validateMagicLink(token);

  if (!sessionToken) {
    return c.html(
      errorPage("Link Expired", "This sign-in link has expired or has already been used. Please request a new one."),
      400,
    );
  }

  setCookie(c, "_session", sessionToken, {
    path: "/",
    httpOnly: true,
    secure: Deno.env.get("ENVIRONMENT") === "production",
    sameSite: "Lax",
    maxAge: 3 * 60 * 60, // 3 hours
  });

  return c.redirect("/dashboard");
});

auth.get("/logout", async (c) => {
  const sessionToken = getCookie(c, "_session");

  if (sessionToken) {
    await logout(sessionToken);
  }

  deleteCookie(c, "_session", { path: "/" });
  return c.redirect("/");
});

export default auth;
