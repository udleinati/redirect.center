/**
 * AES-256-GCM decryption for certificate private keys.
 * Mirrors the logic in packages/certmanager/src/services/crypto.ts.
 */

import { decodeHex } from "@std/encoding/hex";
import { decodeBase64 } from "@std/encoding/base64";

function getEncryptionKey(): string {
  const key = Deno.env.get("CERT_ENCRYPTION_KEY");
  if (!key || key.length !== 64) {
    throw new Error(
      "CERT_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)",
    );
  }
  return key;
}

export async function decrypt(
  ciphertext: string,
  iv: string,
): Promise<string> {
  const keyBytes = decodeHex(getEncryptionKey());
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(iv) },
    key,
    decodeBase64(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
