// Small helpers for generating IDs, secrets and Cloudflare-safe names.
// Uses the Workers runtime's built-in `crypto` global — no dependencies.

const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const MIXED_ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomBytes(n) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

export function randomFromAlphabet(alphabet, length) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// Lowercase-alnum string, safe for Workers script names / D1 db names / URL path segments.
export function randomSlug(length = 8) {
  return randomFromAlphabet(LOWER_ALNUM, length);
}

// Mixed-case alnum string, used for dashboard passwords (a bit more entropy per char).
export function randomPassword(length = 14) {
  return randomFromAlphabet(MIXED_ALNUM, length);
}

// Hex secret, used for the MEZDIA_API_KEY worker binding.
export function randomHex(byteLength = 24) {
  const bytes = randomBytes(byteLength);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Short internal record id used in Telegram callback_data (must stay well under 64 bytes).
export function shortId() {
  return randomFromAlphabet(LOWER_ALNUM, 8);
}

export function workerScriptName(prefix = "mz-") {
  return prefix + randomSlug(10);
}
