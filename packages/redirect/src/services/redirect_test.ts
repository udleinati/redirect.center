import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseDestination } from "./redirect.ts";

// Override config.fqdn for tests
import { config } from "../config.ts";
(config as { fqdn: string }).fqdn = "redirect.center";

Deno.test("parseDestination - opts-slash 1", () => {
  const raw = "www.youtube.com.opts-slash.watch.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/watch"],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-slash 2", () => {
  const raw = "www.youtube.com.opts-slash.watch.opts-slash.abc.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/watch", "/abc"],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-slash 3", () => {
  const raw = "www.youtube.com.opts-slash.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/"],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-slash 4", () => {
  const raw = "www.youtube.com.opts-slash.watch.opts-slash.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/watch", "/"],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - slash 1", () => {
  const raw = "www.youtube.com.slash.watch.slash.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/watch", "/"],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-https 1", () => {
  const raw = "www.youtube.com.opts-https.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "https",
    pathnames: [],
    status: 301,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-statuscode 1", () => {
  const raw = "www.youtube.com.opts-statuscode-302.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: [],
    status: 302,
    host: "www.youtube.com",
    queries: [],
  });
});

Deno.test("parseDestination - opts-uri 1", () => {
  const raw = "www.youtube.com.opts-uri.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/any"],
    status: 301,
    host: "www.youtube.com",
    queries: ["any=true"],
  });
});

Deno.test("parseDestination - opts-query 1", () => {
  const raw = "www.youtube.com.opts-query-IFXFS===.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: [],
    status: 301,
    host: "www.youtube.com",
    queries: ["AnY"],
  });
});

Deno.test("parseDestination - opts-query 2", () => {
  const raw = "www.youtube.com.opts-query-IFXFS---.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: [],
    status: 301,
    host: "www.youtube.com",
    queries: ["AnY"],
  });
});

Deno.test("parseDestination - opts-port", () => {
  const raw = "www.youtube.com.opts-port-8080.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "http",
    pathnames: [],
    status: 301,
    host: "www.youtube.com",
    queries: [],
    port: 8080,
  });
});

Deno.test("parseDestination - mix 1", () => {
  const raw = "127.0.0.1.opts-slash.opts-query.ifqueysdmm.opts-https.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "https",
    pathnames: ["/"],
    status: 301,
    host: "127.0.0.1",
    queries: ["AaBbCc"],
  });
});

Deno.test("parseDestination - mix 2", () => {
  const raw = "127.0.0.1.opts-path-ifqueysdmm.opts-https.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "https",
    pathnames: ["AaBbCc"],
    status: 301,
    host: "127.0.0.1",
    queries: [],
  });
});

Deno.test("parseDestination - mix 3", () => {
  const raw = "www.test.com.opts-slash.xmart.opts-slash.xmart.dll.opts-https.redirect.center";
  const response = parseDestination(raw, "/any?any=true");
  assertEquals(response, {
    protocol: "https",
    pathnames: ["/xmart", "/xmart.dll"],
    status: 301,
    host: "www.test.com",
    queries: [],
  });
});

Deno.test("parseDestination - mix 4", () => {
  const raw = "www.google.com.opts-path-f52gk43u.opts-query-mfrggplemvta.opts-https.redirect.center";
  const response = parseDestination(raw, "/");
  assertEquals(response, {
    protocol: "https",
    pathnames: ["/test"],
    status: 301,
    host: "www.google.com",
    queries: ["abc=def"],
  });
});

Deno.test("parseDestination - mix 5", () => {
  const raw = "www.google.com.opts-path-f52gk43u.opts-query-mfrggplemvta.opts-https.opts-uri.redirect.center";
  const response = parseDestination(raw, "/abc?fxa");
  assertEquals(response, {
    protocol: "https",
    pathnames: ["/test", "/abc"],
    status: 301,
    host: "www.google.com",
    queries: ["abc=def", "fxa"],
  });
});

Deno.test("parseDestination - mix 6", () => {
  const raw = "www.google.com.opts-slash.test.opts-slash.abc.html.redirect.center.";
  const response = parseDestination(raw, "/");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/test", "/abc.html"],
    status: 301,
    host: "www.google.com",
    queries: [],
  });
});

Deno.test("parseDestination - mix 7", () => {
  const raw = "www.google.com.opts-slash.test.opts-slash.abc.opts-slash.redirect.center.";
  const response = parseDestination(raw, "/");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/test", "/abc", "/"],
    status: 301,
    host: "www.google.com",
    queries: [],
  });
});

Deno.test("parseDestination - mix 8", () => {
  const raw = "127.0.0.1.opts-port-22602.opts-slash.test.redirect.center.";
  const response = parseDestination(raw, "/");
  assertEquals(response, {
    protocol: "http",
    pathnames: ["/test"],
    status: 301,
    port: 22602,
    host: "127.0.0.1",
    queries: [],
  });
});
