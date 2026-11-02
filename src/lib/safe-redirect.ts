/**
 * Open-redirect guard for the `next` parameter that sign-in and sign-up read.
 *
 * Accepts only an in-app path: it must start with a single "/" (never "//"),
 * contain no backslash or control characters, and resolve to the same origin.
 * Anything else, and any loop back to the sign-in or sign-up pages, becomes the
 * fallback. Safe to import from the proxy, server code and client components.
 */
export const DEFAULT_AFTER_SIGN_IN = "/feed";

const PLACEHOLDER_ORIGIN = "http://gamora.invalid";
const AUTH_PAGES = ["/sign-in", "/sign-up"];
const MAX_LENGTH = 2048;

export function safeNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_AFTER_SIGN_IN
): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LENGTH) {
    return fallback;
  }
  // Backslashes are treated as slashes by browsers ("/\evil.com"); control
  // characters can be stripped by browsers ("/\t/evil.com").
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (resolved.origin !== PLACEHOLDER_ORIGIN) return fallback;
  if (AUTH_PAGES.includes(resolved.pathname)) return fallback;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
