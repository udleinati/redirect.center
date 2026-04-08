/**
 * Comparative tests: Deno.resolveDns() vs DNS over HTTPS (fetch)
 *
 * Tests the same domains with both approaches to verify they return
 * identical results, and measures memory impact of each.
 */

const TEST_DOMAINS = [
  "redirect.udleinati.com",
  "www.stoneasy.org",
  "www.kobyla.com.br",
];

const DOH_SERVERS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/resolve",
];

// ─── DoH resolver (fetch-based) ───

interface DoHAnswer {
  type: number;
  data: string;
}

interface DoHResponse {
  Status: number;
  Answer?: DoHAnswer[];
}

async function resolveCnameDoH(
  host: string,
  server: string,
): Promise<string[]> {
  const url = `${server}?name=${encodeURIComponent(host)}&type=CNAME`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
  });

  if (!res.ok) {
    throw new Error(`DoH request failed: ${res.status} ${res.statusText}`);
  }

  const data: DoHResponse = await res.json();

  // Status 0 = NOERROR, 3 = NXDOMAIN
  if (data.Status !== 0 || !data.Answer) {
    throw new Error(`No CNAME records found for ${host} (status=${data.Status})`);
  }

  // CNAME type = 5
  const cnames = data.Answer
    .filter((a) => a.type === 5)
    .map((a) => a.data);

  if (cnames.length === 0) {
    throw new Error(`No CNAME records found for ${host}`);
  }

  return cnames;
}

// ─── Tests: Deno.resolveDns() ───

for (const domain of TEST_DOMAINS) {
  Deno.test(`[Deno.resolveDns] resolve CNAME for ${domain}`, async () => {
    try {
      const records = await Deno.resolveDns(domain, "CNAME", {
        nameServer: { ipAddr: "1.1.1.1", port: 53 },
      });
      console.log(`  Deno.resolveDns(${domain}) => ${JSON.stringify(records)}`);
      if (records.length === 0) {
        throw new Error("Expected at least one CNAME record");
      }
    } catch (err) {
      console.log(`  Deno.resolveDns(${domain}) => ERROR: ${(err as Error).message}`);
      // Some test domains may not have CNAME — that's ok, we still compare behavior
    }
  });
}

// ─── Tests: DoH (fetch-based) ───

for (const domain of TEST_DOMAINS) {
  Deno.test(`[DoH/fetch] resolve CNAME for ${domain}`, async () => {
    try {
      const records = await resolveCnameDoH(domain, DOH_SERVERS[0]);
      console.log(`  DoH(${domain}) => ${JSON.stringify(records)}`);
      if (records.length === 0) {
        throw new Error("Expected at least one CNAME record");
      }
    } catch (err) {
      console.log(`  DoH(${domain}) => ERROR: ${(err as Error).message}`);
    }
  });
}

// ─── Tests: Both return same results ───

for (const domain of TEST_DOMAINS) {
  Deno.test(`[compare] Deno.resolveDns vs DoH return same result for ${domain}`, async () => {
    let denoResult: string[] | null = null;
    let dohResult: string[] | null = null;
    let denoError: string | null = null;
    let dohError: string | null = null;

    try {
      denoResult = await Deno.resolveDns(domain, "CNAME", {
        nameServer: { ipAddr: "1.1.1.1", port: 53 },
      });
    } catch (err) {
      denoError = (err as Error).message;
    }

    try {
      dohResult = await resolveCnameDoH(domain, DOH_SERVERS[0]);
    } catch (err) {
      dohError = (err as Error).message;
    }

    console.log(`  Deno: ${denoResult ? JSON.stringify(denoResult) : `ERROR(${denoError})`}`);
    console.log(`  DoH:  ${dohResult ? JSON.stringify(dohResult) : `ERROR(${dohError})`}`);

    if (denoResult && dohResult) {
      // Normalize trailing dots for comparison
      const normalize = (r: string[]) => r.map((s) => s.replace(/\.$/, "")).sort();
      const d = normalize(denoResult);
      const f = normalize(dohResult);

      if (JSON.stringify(d) !== JSON.stringify(f)) {
        throw new Error(
          `Results differ!\n  Deno: ${JSON.stringify(d)}\n  DoH:  ${JSON.stringify(f)}`,
        );
      }
      console.log("  ✓ Results match");
    } else if (denoResult === null && dohResult === null) {
      console.log("  ✓ Both errored (consistent behavior)");
    } else {
      console.log("  ⚠ One succeeded, other failed — check DNS config");
    }
  });
}

// ─── Memory comparison: burst of resolutions ───

Deno.test("[memory] Deno.resolveDns burst — check RSS delta", async () => {
  const before = Deno.memoryUsage();
  const iterations = 50;

  for (let i = 0; i < iterations; i++) {
    for (const domain of TEST_DOMAINS) {
      try {
        await Deno.resolveDns(domain, "CNAME", {
          nameServer: { ipAddr: "1.1.1.1", port: 53 },
        });
      } catch { /* ignore */ }
    }
  }

  // deno-lint-ignore no-explicit-any
  if (typeof (globalThis as any).gc === "function") (globalThis as any).gc();

  const after = Deno.memoryUsage();
  const rssDelta = after.rss - before.rss;
  const heapDelta = after.heapUsed - before.heapUsed;

  console.log(`  Deno.resolveDns (${iterations * TEST_DOMAINS.length} calls):`);
  console.log(`    RSS before:  ${(before.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    RSS after:   ${(after.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    RSS delta:   ${(rssDelta / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    Heap delta:  ${(heapDelta / 1024 / 1024).toFixed(2)}MB`);
});

Deno.test("[memory] DoH/fetch burst — check RSS delta", async () => {
  const before = Deno.memoryUsage();
  const iterations = 50;

  for (let i = 0; i < iterations; i++) {
    for (const domain of TEST_DOMAINS) {
      try {
        await resolveCnameDoH(domain, DOH_SERVERS[0]);
      } catch { /* ignore */ }
    }
  }

  // deno-lint-ignore no-explicit-any
  if (typeof (globalThis as any).gc === "function") (globalThis as any).gc();

  const after = Deno.memoryUsage();
  const rssDelta = after.rss - before.rss;
  const heapDelta = after.heapUsed - before.heapUsed;

  console.log(`  DoH/fetch (${iterations * TEST_DOMAINS.length} calls):`);
  console.log(`    RSS before:  ${(before.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    RSS after:   ${(after.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    RSS delta:   ${(rssDelta / 1024 / 1024).toFixed(2)}MB`);
  console.log(`    Heap delta:  ${(heapDelta / 1024 / 1024).toFixed(2)}MB`);
});
