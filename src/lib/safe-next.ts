// Validates the post-sign-in destination taken from `?next=`.
//
// Only a same-origin path is allowed. A `startsWith("/")` check is not enough:
// browsers treat `\` like `/` and strip tabs and newlines, so `/\evil.example`
// and `/<TAB>/evil.example` both resolve to https://evil.example/. Dot segments
// can also collapse into a protocol-relative URL (`/.//evil.example` becomes
// `//evil.example`). Anything suspicious falls back to "/".
//
// Kept dependency-free (no path aliases) so `node --test` can load it directly.

const FALLBACK = "/";
const PROBE_ORIGIN = "https://gym.invalid";
const MAX_LENGTH = 2048;

// C0 controls, DEL and C1 controls (includes \t, \n, \r).
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

export function safeNextPath(value: unknown): string {
  const next = Array.isArray(value) ? value[0] : value;

  if (typeof next !== "string" || next.length === 0 || next.length > MAX_LENGTH) {
    return FALLBACK;
  }

  // Exactly one leading slash: rejects "", "evil.example", "//host", "/\host".
  if (next[0] !== "/" || next[1] === "/" || next[1] === "\\") return FALLBACK;

  // Backslashes and control characters have no business in our paths.
  if (next.includes("\\") || CONTROL_CHARS.test(next)) return FALLBACK;

  let url: URL;
  try {
    url = new URL(next, PROBE_ORIGIN);
  } catch {
    return FALLBACK;
  }

  // Whatever the parser made of it, it must still be our origin...
  if (url.origin !== PROBE_ORIGIN) return FALLBACK;

  // ...and the normalised path must still start with exactly one slash, or the
  // router would treat it as protocol-relative.
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith("/") || path.startsWith("//")) return FALLBACK;

  return path;
}
