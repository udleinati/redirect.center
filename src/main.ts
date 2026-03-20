import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { compress } from "hono/compress";
import vento from "ventojs";
import { config } from "./config.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { guardian } from "./services/guardian.ts";
import { statistic } from "./services/statistic.ts";
import {
  HttpError,
  resolveDnsAndRedirect,
} from "./services/redirect.ts";
import { logger } from "./helpers/logger.ts";

const MAX_REDIRECTS = 3;
const LOOP_COOKIE = "_rc";

const app = new Hono();
const env = vento({
  includes: new URL("../views", import.meta.url).pathname,
  autoescape: false,
});

app.onError(errorHandler);

// Access log middleware (Apache Combined Log Format)
app.use("/", async (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];

  if (host === config.fqdn) {
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
    const timestamp = new Date().toISOString();

    console.log(
      `${ip} - - [${timestamp}] "${method} ${path} HTTP/${protocol}" ${status} ${contentLength} "${referer}" "${ua}" host=${host} ${ms}ms`,
    );
  }
});

// Compression (gzip/deflate)
app.use("*", compress());

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

  // Loop detection via cookie
  const loopCount = parseInt(getCookie(c, LOOP_COOKIE) || "0", 10);
  if (loopCount >= MAX_REDIRECTS) {
    logger.warn(`[loop] Redirect loop detected for ${host} (${loopCount} redirects)`);
    // Clear cookie and return error
    setCookie(c, LOOP_COOKIE, "", { path: "/", maxAge: 0 });
    return c.html(
      `<html><head><title>Redirect Loop Detected</title></head><body style="font-family:sans-serif;text-align:center;padding:60px">` +
      `<h1>Redirect Loop Detected</h1>` +
      `<p>The domain <strong>${host}</strong> has a DNS misconfiguration that causes an infinite redirect loop.</p>` +
      `<p>Please check your CNAME record — it should not point back to the same domain.</p>` +
      `<p style="margin-top:30px;color:#888">Powered by <a href="https://${config.fqdn}">${config.projectName}</a></p>` +
      `</body></html>`,
      508,
    );
  }

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
    logger.error(`[statistic] write error: ${err}`)
  );

  // Set loop detection cookie (incremented count, expires in 10s)
  const response = c.redirect(redirect.url, redirect.status as 301);
  setCookie(c, LOOP_COOKIE, String(loopCount + 1), {
    path: "/",
    maxAge: 10,
    httpOnly: true,
  });
  return response;
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
    onError(error) {
      console.error(`[server] ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    },
  },
  app.fetch,
);
