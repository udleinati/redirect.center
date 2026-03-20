const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encode(data: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

export function decode(encoded: string): Uint8Array {
  const input = encoded.toUpperCase().replace(/=+$/, "");
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of input) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}
