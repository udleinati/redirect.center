/**
 * Client for Caddy's admin API (:2019).
 * Sends full configuration via POST /load.
 */

import { logger } from "../utils/logger.ts";

const CADDY_ADMIN_API =
  Deno.env.get("CADDY_ADMIN_API") ?? "http://localhost:2019";
const REDIRECT_UPSTREAM =
  Deno.env.get("REDIRECT_UPSTREAM") ?? "http://redirect:80";
const CERTS_DIR = "/certs";

/**
 * Build the full Caddy JSON configuration for the given domains.
 */
export function buildCaddyConfig(domains: string[]): Record<string, unknown> {
  // Build load_files entries for each domain
  const loadFiles = domains.map((domain) => ({
    certificate: `${CERTS_DIR}/${domain}/cert.pem`,
    key: `${CERTS_DIR}/${domain}/key.pem`,
    tags: ["managed"],
  }));

  return {
    apps: {
      tls: {
        certificates: {
          load_files: loadFiles,
        },
        automation: {
          policies: [
            {
              // Disable all automatic ACME issuance
              subjects: ["*"],
              issuers: [],
            },
          ],
        },
      },
      http: {
        servers: {
          https: {
            listen: [":443"],
            routes: [
              {
                // Default route: proxy everything to redirect service
                handle: [
                  {
                    handler: "reverse_proxy",
                    upstreams: [{ dial: REDIRECT_UPSTREAM.replace(/^https?:\/\//, "") }],
                  },
                ],
              },
            ],
            // TLS connection policies
            tls_connection_policies: [
              {
                // Default policy: use loaded certificates
              },
            ],
          },
        },
      },
    },
  };
}

/**
 * Send the full configuration to Caddy via POST /load.
 */
export async function reloadCaddy(domains: string[]): Promise<boolean> {
  const config = buildCaddyConfig(domains);

  try {
    const response = await fetch(`${CADDY_ADMIN_API}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Caddy reload failed (${response.status}): ${body}`);
      return false;
    }

    logger.info(`Caddy reloaded with ${domains.length} domain(s)`);
    return true;
  } catch (error) {
    logger.error("Failed to connect to Caddy admin API:", error);
    return false;
  }
}

/**
 * Wait for Caddy admin API to become available.
 */
export async function waitForCaddy(
  maxRetries = 30,
  intervalMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${CADDY_ADMIN_API}/config/`);
      if (response.ok || response.status === 404) {
        // 404 is OK — means Caddy is running but has no config yet
        logger.info("Caddy admin API is ready");
        return;
      }
    } catch {
      // Not ready yet
    }
    logger.debug(
      `Waiting for Caddy admin API... (${i + 1}/${maxRetries})`,
    );
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Caddy admin API not available after retries");
}
