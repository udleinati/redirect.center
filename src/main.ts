import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import vento from "ventojs";
import { config } from "./config.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { guardian } from "./services/guardian.ts";
import { statistic } from "./services/statistic.ts";
import {
  HttpError,
  resolveDnsAndRedirect,
} from "./services/redirect.ts";

const app = new Hono();
const env = vento({
  includes: new URL("../views", import.meta.url).pathname,
  autoescape: false,
});

app.onError(errorHandler);

// Static files
app.use("/public/*", serveStatic({ root: "./" }));

// Homepage - only for the FQDN host
app.get("/", async (c) => {
  const host = (c.req.header("host") || "").split(":")[0];

  if (host === config.fqdn) {
    const statistics = await statistic.overview();

    const template = await env.load("index.vto");
    const result = await template({
      app: config,
      statistics,
    });

    return c.html(result.content);
  }

  // If not FQDN, treat as redirect
  return handleRedirect(c);
});

// FQDN-only routes: return 404 for non-redirect paths on the service domain
app.all("/*", (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host === config.fqdn) {
    return c.json({ statusCode: 404, message: "Not Found" }, 404);
  }
  return next();
});

// All other routes - redirect logic
app.all("/*", handleRedirect);

async function handleRedirect(c: import("hono").Context): Promise<Response> {
  let host = c.req.header("host") || "";
  if (!host) throw new HttpError(400, "Bad Request");
  host = host.includes(":") ? host.split(":")[0] : host;

  // Source guardian check
  if (guardian.isDenied(host)) {
    throw new HttpError(403, "Forbidden");
  }

  // Resolve redirect
  const redirect = await resolveDnsAndRedirect(host, c.req.url.replace(/^https?:\/\/[^/]+/, ""));

  // Destination guardian check
  if (guardian.isDenied(redirect.fqdn)) {
    throw new HttpError(403, "Forbidden");
  }

  // Statistics (fire and forget)
  statistic.write(host).catch((err) =>
    console.error(`[statistic] write error: ${err}`)
  );

  // Log
  const reqPath = new URL(c.req.url).pathname;
  console.info(`[redirect] ${host}${reqPath} -> ${redirect.status} ${redirect.url}`);

  return c.redirect(redirect.url, redirect.status as 301);
}

// Start server
await statistic.ensureReady();

Deno.serve(
  {
    port: config.listenPort,
    hostname: config.listenIp,
    onListen({ hostname, port }) {
      console.log(`[server] Server is listening on ${hostname}:${port}`);
    },
  },
  app.fetch,
);
