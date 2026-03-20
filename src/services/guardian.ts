import psl from "psl";

interface GuardianData {
  denyFqdn: string[];
}

class GuardianService {
  private filepath: string;
  private fileContent: GuardianData = { denyFqdn: [] };

  constructor() {
    this.filepath = new URL("../../db/guardian.json", import.meta.url).pathname;
    this.openAndParse();

    const interval = 60 * 1000;
    setInterval(() => {
      console.debug(`[guardian] db.reload - interval ${interval}`);
      this.openAndParse();
    }, interval);
  }

  isDenied(fqdn: string): boolean {
    let isDenied = this.fileContent.denyFqdn?.includes(fqdn);

    if (!isDenied) {
      const parsed = psl.parse(fqdn);
      if ("domain" in parsed && parsed.domain) {
        isDenied = this.fileContent.denyFqdn?.includes(parsed.domain);
      }
    }

    return isDenied ?? false;
  }

  openAndParse(): void {
    try {
      const text = Deno.readTextFileSync(this.filepath);
      this.fileContent = JSON.parse(text || "{}");
    } catch (err) {
      console.error(`[guardian] Failed to load guardian.json: ${err}`);
    }
  }

  getFileContent(): GuardianData {
    return this.fileContent;
  }
}

export const guardian = new GuardianService();
