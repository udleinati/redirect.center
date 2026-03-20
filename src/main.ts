import { Hono } from "hono";
import { compress } from "hono/compress";
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

// Access log middleware (Apache Combined Log Format)
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") || "-";
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  const protocol = c.req.header("x-forwarded-proto") || url.protocol.replace(":", "");
  const status = c.res.status;
  const contentLength = c.res.headers.get("content-length") || "-";
  const referer = c.req.header("referer") || "-";
  const ua = c.req.header("user-agent") || "-";
  const host = c.req.header("host") || "-";
  const timestamp = new Date().toISOString();

  console.log(
    `${ip} - - [${timestamp}] "${method} ${path} HTTP/${protocol}" ${status} ${contentLength} "${referer}" "${ua}" host=${host} ${ms}ms`,
  );
});

// Compression (gzip/deflate)
app.use("*", compress());

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
app.all("/*", async (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host === config.fqdn) {
    return c.json({ statusCode: 404, message: "Not Found" }, 404);
  }
  await next();
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
