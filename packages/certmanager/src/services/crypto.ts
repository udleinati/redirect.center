import { decodeHex } from "@std/encoding/hex";
import { encodeBase64, decodeBase64 } from "@std/encoding/base64";

function getEncryptionKey(): string {
  const key = Deno.env.get("CERT_ENCRYPTION_KEY");
  if (!key || key.length !== 64) {
    throw new Error("CERT_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32");
  }
  return key;
}

export async function encrypt(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const keyBytes = decodeHex(getEncryptionKey());
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return {
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
    iv: encodeBase64(iv),
  };
}

export async function decrypt(ciphertext: string, iv: string): Promise<string> {
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
