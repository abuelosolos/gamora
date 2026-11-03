import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { clientIp, withinRateLimits } from "@/server/security/rate-limit";

const handler = toNextJsHandler(auth);

// Credential endpoints. The sign-in form limits attempts in its own action, but
// the raw Better Auth API is public too, so guessing against it directly would
// skip that limit. Same fail-closed helper, counted per IP.
const CREDENTIAL_PATH = /\/(sign-in|sign-up|request-password-reset|reset-password|change-password)(\/|$)/;

export const GET = handler.GET;

export async function POST(request: Request) {
  if (CREDENTIAL_PATH.test(new URL(request.url).pathname)) {
    const allowed = await withinRateLimits([
      { name: "auth-api:ip", key: await clientIp(), limit: 30, windowSeconds: 15 * 60 },
    ]);
    if (!allowed) {
      return Response.json({ error: "rate_limited", message: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
    }
  }
  return handler.POST(request);
}
