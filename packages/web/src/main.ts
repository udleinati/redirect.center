import { Hono } from "hono";
import { compress } from "hono/compress";
import { serveStatic } from "hono/deno";
import { getConfig } from "../../shared/src/config.ts";
import { runMigrations } from "../../shared/src/db/migrate.ts";
import * as subscriptionQueries from "../../shared/src/db/queries/subscriptions.ts";
import authRoutes from "./routes/auth.ts";
import dashboardRoutes from "./routes/dashboard.ts";
import termsRoutes from "./routes/terms.ts";
import webhookRoutes from "./routes/webhook.ts";
import { landingPage } from "./templates/pages.ts";

const app = new Hono();

// Middleware
app.use("*", compress());

// Static files
app.use("/static/*", serveStatic({ root: "./src/" }));

// Landing page
app.get("/", (c) => c.html(landingPage()));

// Routes
app.route("/auth", authRoutes);
app.route("/terms", termsRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/api/webhooks", webhookRoutes);

// Run migrations and start server
const config = getConfig();
const port = Deno.env.get("WEB_PORT")
  ? parseInt(Deno.env.get("WEB_PORT")!, 10)
  : config.listenPort;

console.log("[web] Running database migrations...");
await runMigrations();

// Grace period cleanup job — runs every hour
async function cleanupGracePeriods() {
  try {
    const cleaned = await subscriptionQueries.cleanupExpiredGracePeriods();
    if (cleaned > 0) {
      console.log(`[cleanup] Soft-deleted ${cleaned} expired subscription(s) and their domains`);
    }
  } catch (error) {
    console.error("[cleanup] Grace period cleanup error:", error);
  }
}

// Run once on startup, then every hour
await cleanupGracePeriods();
setInterval(cleanupGracePeriods, 60 * 60 * 1000);

console.log(`[web] Starting server on port ${port}`);
Deno.serve({ port, hostname: config.listenIp }, app.fetch);
