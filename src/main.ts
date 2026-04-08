import { Hono } from "hono";
import { compress } from "hono/compress";
import vento from "ventojs";
import { config } from "./config.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { guardian } from "./services/guardian.ts";
import {
  HttpError,
  resolveDnsAndRedirect,
} from "./services/redirect.ts";
import { dnsCacheSize, dnsInflightSize } from "./helpers/dns.ts";

const app = new Hono();
const compressMiddleware = compress();
const env = vento({
  includes: new URL("../views", import.meta.url).pathname,
  autoescape: false,
});

app.onError(errorHandler);

// Access log middleware
app.use("/", async (c, next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") || "-";
  const host = c.req.header("host") || "-";
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  const ua = c.req.header("user-agent") || "-";

  // Log BEFORE processing
  console.log(
    `[req] ${ip} "${method} ${path}" host=${host} ua="${ua}"`,
  );

  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  // Log AFTER processing
  const status = c.res.status;
  const location = c.res.headers.get("location") || "-";

  console.log(
    `[res] ${ip} "${method} ${path}" host=${host} ${status} location=${location} ${ms}ms`,
  );
});

// Homepage - only for the FQDN host (with compression)
app.get("/", async (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];

  if (host === config.fqdn) {
    const ua = c.req.header("user-agent");
    if (!ua) return c.json({ statusCode: 403, message: "Forbidden" }, 403);

    // Apply compression only to the homepage response
    return compressMiddleware(c, async () => {
      const template = await env.load("index.vto");
      const result = await template({
        app: config,
      });
      c.header("Cache-Control", "public, max-age=300");
      c.res = c.html(result.content);
    });
  }

  // If not FQDN, skip to redirect (no compression overhead)
  await next();
});

// Diagnostic endpoint — only accessible on the FQDN
app.get("/healthz", (c) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host !== config.fqdn) return c.notFound();

  const mem = Deno.memoryUsage();
  return c.json({
    uptime: Math.floor(performance.now() / 1000),
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
    },
    dnsCache: dnsCacheSize(),
    dnsInflight: dnsInflightSize(),
  });
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

// Periodic health log — helps correlate CPU spikes in CloudWatch with memory/cache state
setInterval(() => {
  const mem = Deno.memoryUsage();
  console.log(
    `[health] rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB heap=${(mem.heapUsed / 1024 / 1024).toFixed(1)}/${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB external=${(mem.external / 1024 / 1024).toFixed(1)}MB dnsCache=${dnsCacheSize()} dnsInflight=${dnsInflightSize()}`,
  );
}, 60_000);

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
