import psl from "psl";
import { logger } from "../helpers/logger.ts";

interface GuardianData {
  denyFqdn: string[];
}

class GuardianService {
  private filepath: string;
  private denySet = new Set<string>();

  constructor() {
    this.filepath = new URL("../../db/guardian.json", import.meta.url).pathname;
    this.openAndParse();

    const interval = 60 * 1000;
    setInterval(() => {
      logger.debug(`[guardian] db.reload - interval ${interval}`);
      this.openAndParse();
    }, interval);
  }

  isDenied(fqdn: string): boolean {
    // O(1) check against FQDN
    if (this.denySet.has(fqdn)) return true;

    // Extract base domain with simple split (covers most cases: example.com from sub.example.com)
    const parts = fqdn.split(".");
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join(".");
      if (this.denySet.has(baseDomain)) return true;
    }

    return false;
  }

  openAndParse(): void {
    try {
      const text = Deno.readTextFileSync(this.filepath);
      const data: GuardianData = JSON.parse(text || "{}");

      // Pre-compute: add both raw entries and their psl-parsed base domains
      const newSet = new Set<string>();
      for (const fqdn of data.denyFqdn ?? []) {
        newSet.add(fqdn);
        const parsed = psl.parse(fqdn);
        if ("domain" in parsed && parsed.domain) {
          newSet.add(parsed.domain);
        }
      }
      this.denySet = newSet;
    } catch (err) {
      logger.error(`[guardian] Failed to load guardian.json: ${err}`);
    }
  }
}

export const guardian = new GuardianService();
