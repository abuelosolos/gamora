import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Layer 1 of 4. Convenience only: it checks that a session cookie EXISTS, not
 * that it is valid, so it must never be the real protection. The real checks
 * are the layout guard (requireUser in (app)/(private)), the action check
 * (requireUser in every server action) and the ownership check in every
 * update or delete query.
 *
 * Signed-out visitors can read: landing, sign-in/up, terms, privacy, the feed,
 * posts, profiles and the Coming soon pages. Everything else needs a session. Writes are enforced in
 * the server actions regardless of this list.
 */
const PUBLIC_EXACT = ["/", "/sign-in", "/sign-up", "/terms", "/privacy"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/health", "/feed", "/post", "/u", "/unavailable"];
const AUTH_PAGES = ["/sign-in", "/sign-up"];
// The welcome page is for signed-out visitors; a signed-in user goes to the feed
// (public, so a stale cookie cannot cause a redirect loop).
const SIGNED_OUT_ONLY = ["/", ...AUTH_PAGES];

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((base) => isUnder(pathname, base))) return true;
  // Temporary component review page (it also returns 404 in production).
  if (process.env.NODE_ENV !== "production" && isUnder(pathname, "/dev")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !isPublic(pathname)) {
    // Route handlers get a status code, not an HTML redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", `${pathname}${search}`); // validated with safeNextPath after sign-in
    return NextResponse.redirect(url);
  }

  if (hasSession && SIGNED_OUT_ONLY.includes(pathname)) {
    const target = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
