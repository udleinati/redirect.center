import { Hono } from "hono";
import { compress } from "hono/compress";
import { getConnInfo } from "hono/deno";
import vento from "ventojs";
import { config } from "./config.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { guardian } from "./services/guardian.ts";
import {
  HttpError,
  resolveDnsAndRedirect,
} from "./services/redirect.ts";
import { logger } from "./helpers/logger.ts";
const app = new Hono();
const env = vento({
  includes: new URL("../views", import.meta.url).pathname,
  autoescape: false,
});

app.onError(errorHandler);

// Access log middleware (Apache Combined Log Format)
app.use("/", async (c, next) => {
  const start = Date.now();
  await next();

  const host = c.req.header("host") || "-";
  //if (host != config.fqdn) return;

  const ms = Date.now() - start;
  const connInfo = getConnInfo(c);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    (connInfo.remote.address ?? "-");
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  const protocol = c.req.header("x-forwarded-proto") || url.protocol.replace(":", "");
  const status = c.res.status;
  const contentLength = c.res.headers.get("content-length") || "-";
  const referer = c.req.header("referer") || "-";
  const ua = c.req.header("user-agent") || "-";
  const timestamp = new Date().toISOString();

  console.log(
    `${ip} - - [${timestamp}] "${method} ${path} HTTP/${protocol}" ${status} ${contentLength} "${referer}" "${ua}" host=${host} ${ms}ms`,
  );
});

// Homepage - only for the FQDN host (with compression)
app.get("/", compress(), async (c) => {
  const host = (c.req.header("host") || "").split(":")[0];
  const ua = c.req.header("user-agent");
  
  if (!ua) return c.json({ statusCode: 403, message: "Forbidden" }, 403);

  if (host === config.fqdn) {
    const template = await env.load("index.vto");
    const result = await template({
      app: config,
    });
    c.header("Cache-Control", "public, max-age=300");
    return c.html(result.content);
  }

  // If not FQDN, treat as redirect
  return handleRedirect(c);
});

// robots.txt for redirect domains — tells crawlers not to follow/index redirects
app.get("/robots.txt", (c) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host === config.fqdn) return c.notFound();
  c.header("Cache-Control", "public, max-age=86400");
  return c.text("User-agent: *\nDisallow: /\n");
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

  // Minimal redirect response: no body, just Location header
  // Encode non-ASCII characters to avoid ByteString errors in Response headers
  let safeLocation: string;
  try {
    safeLocation = new URL(redirect.url).href;
  } catch {
    safeLocation = encodeURI(redirect.url);
  }

  return new Response(null, {
    status: redirect.status,
    headers: {
      "Location": safeLocation,
      "Cache-Control": "public, max-age=15",
    },
  });
}

// Start server
Deno.serve(
  {
    port: config.listenPort,
    hostname: config.listenIp,
    onListen({ hostname, port }) {
      console.log(`[server] Server is listening on ${hostname}:${port}`);
    },
    onError(error) {
      console.error(`[server] ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    },
  },
  app.fetch,
);
