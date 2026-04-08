import { config } from "../config.ts";
import { createDestination } from "../types/destination.ts";
import type { Destination } from "../types/destination.ts";
import { RedirectResponse } from "../types/redirect-response.ts";
import { dnsResolveCname } from "../helpers/dns.ts";
import { decode } from "../helpers/base32.ts";
import { logger } from "../helpers/logger.ts";

// Reusable TextDecoder — avoids creating native objects per request
const textDecoder = new TextDecoder();

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function resolveDnsAndRedirect(
  host: string,
  reqUrl: string,
): Promise<RedirectResponse> {
  const raw = await resolveDns(host);
  return getRedirectResponse(raw, reqUrl);
}

export function getRedirectResponse(
  raw: string,
  reqUrl: string,
): RedirectResponse {
  const destination = parseDestination(raw, reqUrl);
  return new RedirectResponse(destination);
}

export async function resolveDns(host: string): Promise<string> {
  // Extract subdomains via simple split (avoids heavy parseDomain trie lookup)
  const labels = host.split(".");
  const hasRedirectSubdomain = labels.includes("redirect");

  try {
    const resolved = await dnsResolveCname(host);

    if (resolved.length > 1) {
      throw new HttpError(400, `More than one record on the host ${host}`);
    }

    // Remove trailing dot from CNAME if present
    return resolved[0].replace(/\.$/, "");
  } catch (err: unknown) {
    const error = err as { code?: string; name?: string; status?: number; message?: string };

    // Deno's DNS resolver may throw errors without a `code` property
    // (e.g., "no records found for Query ..."). Detect and normalize them.
    const isDnsNotFound = error.code === "ENODATA" ||
      (!error.code && error.message?.includes("no records found"));

    if (
      isDnsNotFound &&
      !hasRedirectSubdomain
    ) {
      return resolveDns(`redirect.${host}`);
    }

    const isKnownDnsError = isDnsNotFound ||
      ["ENOTFOUND", "ESERVFAIL", "EBADRESP", "ECONNREFUSED"].includes(
        error.code ?? "",
      ) ||
      error.message?.includes("invalid characters") ||
      error.message?.includes("proto error");

    if (isKnownDnsError) {
      throw new HttpError(
        400,
        `The destination is not properly set, check the host ${host}`,
      );
    }

    throw err;
  }
}

export function parseDestination(raw: string, reqUrl: string): Destination {
  const destination = createDestination();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(reqUrl, "http://placeholder");
  } catch {
    throw new HttpError(400, "Bad Request");
  }

  // Remove trailing dot and FQDN suffix
  raw = raw.replace(/\.$/, "");
  raw = raw.replace(`.${config.fqdn}`, "");

  let r: RegExpMatchArray | null;

  let labels = raw.split(".");

  labels = labels.map((label) => {
    switch (true) {
      case !!label.match(/^(opts-|_)https$/): {
        destination.protocol = "https";
        return "";
      }
      case !!(r = label.match(/^(?:opts-|_)(?:path)-(.*)$/)): {
        r![1] = r![1].replace(/-/g, "=");
        destination.pathnames.push(
          textDecoder.decode(decode(r![1])),
        );
        return "";
      }
      case !!(r = label.match(/^(?:opts-|_)statuscode-(301|302|307|308)$/)): {
        destination.status = parseInt(r![1]);
        return "";
      }
      case !!(r = label.match(/^(?:opts-|_)port-(\d+)$/)): {
        destination.port = parseInt(r![1]);
        return "";
      }
      case !!label.match(/^(opts-|_)uri$/): {
        if (parsedUrl.search) {
          destination.queries.push(parsedUrl.search.substring(1));
        }
        if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
          destination.pathnames.push(parsedUrl.pathname);
        }
        return "";
      }
      default:
        return label;
    }
  });

  raw = labels.filter((e) => e).join(".");

  /* opts-query */
  {
    const queries: string[] = [];
    let loop = 1;

    while (
      (r = raw.match(/\.(?:opts-|_|)(?:query|base32)[.\-]([^.]+)/))
    ) {
      if (loop++ > 5) logger.warn(`[redirect] CHECK RAW (query) ${raw}`);

      raw = raw.replace(r[0], "");
      r[1] = r[1].replace(/-/g, "=");
      queries.push(textDecoder.decode(decode(r[1])));
    }

    destination.queries = [...queries, ...destination.queries];
  }

  /* opts-slash */
  {
    const pathnames: string[] = [];
    let loop = 1;

    while (
      (r = raw.match(
        /(\.(?:opts-|_|)slash\.)(.*?)(?:(?:(?:.opts-slash|.slash|_slash))|$)/,
      )) ||
      (r = raw.match(/\.(?:opts-|_|)slash/))
    ) {
      if (loop++ > 5) logger.warn(`[redirect] CHECK RAW (slash) ${raw}`);

      if (r && r[2]) {
        raw = raw.replace(`${r[1]}${r[2]}`, "");
        pathnames.push(`/${r[2]}`);
      } else {
        raw = raw.replace(r![0], "");
        pathnames.push("/");
      }
    }

    destination.pathnames = [...pathnames, ...destination.pathnames];
  }

  destination.host = raw;

  return destination;
}
