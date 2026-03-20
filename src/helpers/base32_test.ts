import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decode, encode } from "./base32.ts";

Deno.test("base32 encode", () => {
  const input = new TextEncoder().encode("AnY");
  const result = encode(input);
  assertEquals(result, "IFXFS");
});

Deno.test("base32 decode", () => {
  const result = decode("IFXFS");
  const text = new TextDecoder().decode(result);
  assertEquals(text, "AnY");
});

Deno.test("base32 encode/decode roundtrip", () => {
  const original = "AaBbCc";
  const encoded = encode(new TextEncoder().encode(original));
  const decoded = new TextDecoder().decode(decode(encoded));
  assertEquals(decoded, original);
});

Deno.test("base32 decode with padding", () => {
  const result = decode("IFXFS===");
  const text = new TextDecoder().decode(result);
  assertEquals(text, "AnY");
});

Deno.test("base32 encode /test", () => {
  const input = new TextEncoder().encode("/test");
  const result = encode(input);
  assertEquals(result.toLowerCase(), "f52gk43u".toLowerCase());
});

Deno.test("base32 encode abc=def", () => {
  const input = new TextEncoder().encode("abc=def");
  const result = encode(input);
  assertEquals(result.toLowerCase(), "mfrggplemvta".toLowerCase());
});
