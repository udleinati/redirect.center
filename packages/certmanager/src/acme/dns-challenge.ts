/**
 * DNS challenge management for CNAME delegation approach.
 *
 * Instead of requiring users to create TXT records directly,
 * we ask them to create a CNAME:
 *   _acme-challenge.example.com → _acme-challenge.example.com.acme.${FQDN}
 *
 * Then we manage the TXT records in our own DNS zone (acme.redirect.center)
 * via the DNS provider API (Route53, Cloudflare, etc.).
 *
 * For now, this module provides the interface. The actual DNS provider
 * implementation will be added based on the DNS_PROVIDER env var.
 */

const DNS_PROVIDER = Deno.env.get("DNS_PROVIDER") ?? "mock";
const FQDN = Deno.env.get("FQDN") ?? "redirect.center";

/**
 * Set a TXT record for the ACME challenge in our DNS zone.
 * Record name: _acme-challenge.{domain}.acme.${FQDN}
 * Record value: {keyAuthorization}
 */
export async function setChallengeTxtRecord(
  domain: string,
  keyAuthorization: string,
): Promise<void> {
  const recordName = `_acme-challenge.${domain}.acme.${FQDN}`;

  switch (DNS_PROVIDER) {
    case "route53":
      await setRoute53TxtRecord(recordName, keyAuthorization);
      break;
    case "cloudflare":
      await setCloudflareTxtRecord(recordName, keyAuthorization);
      break;
    case "pebble":
    case "mock":
      console.log(`[dns-challenge] MOCK: Set TXT ${recordName} = ${keyAuthorization}`);
      break;
    default:
      throw new Error(`Unsupported DNS provider: ${DNS_PROVIDER}`);
  }
}

/**
 * Remove a TXT record after certificate issuance.
 */
export async function removeChallengeTxtRecord(domain: string): Promise<void> {
  const recordName = `_acme-challenge.${domain}.acme.${FQDN}`;

  switch (DNS_PROVIDER) {
    case "route53":
      await removeRoute53TxtRecord(recordName);
      break;
    case "cloudflare":
      await removeCloudflareTxtRecord(recordName);
      break;
    case "pebble":
    case "mock":
      console.log(`[dns-challenge] MOCK: Removed TXT ${recordName}`);
      break;
    default:
      throw new Error(`Unsupported DNS provider: ${DNS_PROVIDER}`);
  }
}

// --- Route53 implementation ---

async function setRoute53TxtRecord(name: string, value: string): Promise<void> {
  const zoneId = Deno.env.get("DNS_ZONE_ID");
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_REGION") ?? "us-east-1";

  if (!zoneId || !accessKey || !secretKey) {
    throw new Error("Route53 requires DNS_ZONE_ID, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
  }

  // Use AWS CLI or direct API call
  const body = JSON.stringify({
    Changes: [{
      Action: "UPSERT",
      ResourceRecordSet: {
        Name: name,
        Type: "TXT",
        TTL: 60,
        ResourceRecords: [{ Value: `"${value}"` }],
      },
    }],
  });

  const cmd = new Deno.Command("aws", {
    args: [
      "route53", "change-resource-record-sets",
      "--hosted-zone-id", zoneId,
      "--change-batch", JSON.stringify({
        Changes: [{
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: name,
            Type: "TXT",
            TTL: 60,
            ResourceRecords: [{ Value: `"${value}"` }],
          },
        }],
      }),
      "--region", region,
    ],
    env: {
      AWS_ACCESS_KEY_ID: accessKey,
      AWS_SECRET_ACCESS_KEY: secretKey,
      AWS_DEFAULT_REGION: region,
    },
  });

  const output = await cmd.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`Route53 UPSERT failed: ${error}`);
  }

  console.log(`[dns-challenge] Route53: Set TXT ${name}`);
  void body; // suppress unused warning
}

async function removeRoute53TxtRecord(name: string): Promise<void> {
  // Route53 deletion requires knowing the current value.
  // In practice, we'd look it up first. For now, just log.
  console.log(`[dns-challenge] Route53: Would remove TXT ${name}`);
  await Promise.resolve();
}

// --- Cloudflare implementation ---

async function setCloudflareTxtRecord(name: string, value: string): Promise<void> {
  const zoneId = Deno.env.get("DNS_ZONE_ID");
  const apiKey = Deno.env.get("DNS_PROVIDER_API_KEY");

  if (!zoneId || !apiKey) {
    throw new Error("Cloudflare requires DNS_ZONE_ID, DNS_PROVIDER_API_KEY");
  }

  // Delete existing record first
  await removeCloudflareTxtRecord(name);

  // Create new record
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "TXT",
        name,
        content: value,
        ttl: 60,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare create TXT failed: ${error}`);
  }

  console.log(`[dns-challenge] Cloudflare: Set TXT ${name}`);
}

async function removeCloudflareTxtRecord(name: string): Promise<void> {
  const zoneId = Deno.env.get("DNS_ZONE_ID");
  const apiKey = Deno.env.get("DNS_PROVIDER_API_KEY");

  if (!zoneId || !apiKey) return;

  // Find existing records
  const listResponse = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!listResponse.ok) return;

  const data = await listResponse.json() as { result: Array<{ id: string }> };
  for (const record of data.result ?? []) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
  }

  console.log(`[dns-challenge] Cloudflare: Removed TXT ${name}`);
}
