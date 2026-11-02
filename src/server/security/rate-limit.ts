import "server-only"
import { createHash } from "node:crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"
import { env } from "@/lib/env.server"

/**
 * Sliding-window rate limits on Upstash Redis.
 *
 * Fails CLOSED: if Redis cannot be reached the call is refused, because an
 * outage must not turn into unlimited password guesses.
 */
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

const limiters = new Map<string, Ratelimit>()

function getLimiter(name: string, limit: number, windowSeconds: number): Ratelimit {
  const id = `${name}:${limit}:${windowSeconds}`
  let limiter = limiters.get(id)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `gamora:rl:${name}`,
    })
    limiters.set(id, limiter)
  }
  return limiter
}

export interface RateLimitRule {
  /** Bucket name, e.g. "sign-in:ip". */
  name: string
  /** What is counted: an IP, a user id or a hashed email. */
  key: string
  limit: number
  windowSeconds: number
}

/** True when every rule still has room. Stops at the first rule that is full. */
export async function withinRateLimits(rules: RateLimitRule[]): Promise<boolean> {
  try {
    for (const rule of rules) {
      const result = await getLimiter(rule.name, rule.limit, rule.windowSeconds).limit(rule.key)
      if (!result.success) return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Caller IP. On Vercel the platform sets x-forwarded-for, so the first entry is
 * the real client. Off Vercel it can be spoofed, so treat it as best effort.
 */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || h.get("x-real-ip") || "unknown"
}

/** Hash so emails are never stored in Redis in clear text. */
export function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32)
}
