/**
 * Manual DNS CNAME resolver via raw UDP sockets.
 *
 * Replaces Deno.resolveDns() to avoid its native memory leak.
 * Uses Deno.listenDatagram() with explicit close() so resources
 * are freed immediately instead of waiting for GC.
 */

const DNS_TIMEOUT_MS = 3_000;

/** Build a DNS query packet for a CNAME record */
function buildQuery(host: string, id: number): Uint8Array {
  const parts: number[] = [];

  // Header (12 bytes)
  parts.push((id >> 8) & 0xff, id & 0xff); // ID
  parts.push(0x01, 0x00); // Flags: standard query, recursion desired
  parts.push(0x00, 0x01); // QDCOUNT: 1
  parts.push(0x00, 0x00); // ANCOUNT: 0
  parts.push(0x00, 0x00); // NSCOUNT: 0
  parts.push(0x00, 0x00); // ARCOUNT: 0

  // Question: encode hostname as DNS labels
  for (const label of host.split(".")) {
    parts.push(label.length);
    for (let i = 0; i < label.length; i++) {
      parts.push(label.charCodeAt(i));
    }
  }
  parts.push(0x00); // End of name

  parts.push(0x00, 0x05); // QTYPE: CNAME (5)
  parts.push(0x00, 0x01); // QCLASS: IN (1)

  return new Uint8Array(parts);
}

/** Parse a DNS name from a packet, handling compression pointers */
function parseName(buf: Uint8Array, offset: number): { name: string; newOffset: number } {
  const labels: string[] = [];
  let jumped = false;
  let newOffset = offset;
  let hops = 0;

  while (hops++ < 64) {
    if (offset >= buf.length) break;
    const len = buf[offset];

    if (len === 0) {
      if (!jumped) newOffset = offset + 1;
      break;
    }

    // Compression pointer (top 2 bits are 11)
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) newOffset = offset + 2;
      offset = ((len & 0x3f) << 8) | buf[offset + 1];
      jumped = true;
      continue;
    }

    offset++;
    let label = "";
    for (let i = 0; i < len && offset + i < buf.length; i++) {
      label += String.fromCharCode(buf[offset + i]);
    }
    labels.push(label);
    offset += len;
  }

  return { name: labels.join("."), newOffset: jumped ? newOffset : offset };
}

/** Parse CNAME records from a DNS response packet */
function parseResponse(buf: Uint8Array): string[] {
  if (buf.length < 12) throw new Error("DNS response too short");

  const rcode = buf[3] & 0x0f;
  if (rcode === 3) throw new Error("no records found for Query"); // NXDOMAIN
  if (rcode !== 0) throw new Error(`DNS error rcode=${rcode}`);

  const qdcount = (buf[4] << 8) | buf[5];
  const ancount = (buf[6] << 8) | buf[7];

  if (ancount === 0) throw new Error("no records found for Query");

  // Skip header (12 bytes) + question section
  let offset = 12;
  for (let q = 0; q < qdcount; q++) {
    const parsed = parseName(buf, offset);
    offset = parsed.newOffset;
    offset += 4; // QTYPE (2) + QCLASS (2)
  }

  // Parse answer section
  const cnames: string[] = [];
  for (let a = 0; a < ancount; a++) {
    if (offset >= buf.length) break;
    const nameParsed = parseName(buf, offset);
    offset = nameParsed.newOffset;

    if (offset + 10 > buf.length) break;
    const rtype = (buf[offset] << 8) | buf[offset + 1];
    const rdlength = (buf[offset + 8] << 8) | buf[offset + 9];
    offset += 10;

    if (rtype === 5) {
      // CNAME record
      const cnameParsed = parseName(buf, offset);
      cnames.push(cnameParsed.name);
    }

    offset += rdlength;
  }

  if (cnames.length === 0) throw new Error("no records found for Query");
  return cnames;
}

/**
 * Resolve CNAME via raw UDP socket.
 * The socket is explicitly closed after use to free native resources immediately.
 */
export async function udpResolveCname(
  host: string,
  nameServer: string,
): Promise<string[]> {
  const id = Math.floor(Math.random() * 0xffff);
  const query = buildQuery(host, id);
  const target: Deno.NetAddr = { hostname: nameServer, port: 53, transport: "udp" };

  const sock = Deno.listenDatagram({ hostname: "0.0.0.0", port: 0, transport: "udp" });

  try {
    await sock.send(query, target);

    // Race between receive and timeout
    const result = await Promise.race([
      sock.receive(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), DNS_TIMEOUT_MS)
      ),
    ]);

    const [data] = result;
    return parseResponse(data);
  } finally {
    try { sock.close(); } catch { /* already closed */ }
  }
}
