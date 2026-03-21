import { Hono } from "hono";
import { compress } from "hono/compress";
import { serveStatic } from "hono/deno";
import { getConfig } from "../../shared/src/config.ts";
import { runMigrations } from "../../shared/src/db/migrate.ts";
import authRoutes from "./routes/auth.ts";
import dashboardRoutes from "./routes/dashboard.ts";
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
app.route("/dashboard", dashboardRoutes);
app.route("/api/webhooks", webhookRoutes);

// Run migrations and start server
const config = getConfig();
const port = Deno.env.get("WEB_PORT")
  ? parseInt(Deno.env.get("WEB_PORT")!, 10)
  : config.listenPort;

console.log("[web] Running database migrations...");
await runMigrations();

console.log(`[web] Starting server on port ${port}`);
Deno.serve({ port, hostname: config.listenIp }, app.fetch);
