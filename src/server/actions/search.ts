"use server"

import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { clearHistory, recordProfileVisit, recordQuery, searchPeople, type PersonResult } from "@/server/services/search"
import { recordSearchSchema, searchInputSchema } from "@/server/validators/search"

export type SearchResult =
  | { ok: true; people: PersonResult[] }
  | { ok: false; error: "unauthorized" | "rate_limited" | "invalid" | "server"; message: string }

export type SimpleResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "rate_limited" | "invalid" | "server"; message: string }

/**
 * Live search while typing. Pipeline: validate, session, rate limit, read.
 * Nothing is written and no row belongs to anyone in particular, so there is
 * no ownership check; results are the same public profile fields a profile
 * page shows (never email, id or admin flag).
 */
export async function searchPeopleAction(input: unknown): Promise<SearchResult> {
  const parsed = searchInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Check your search." }
  }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to search." }

  const allowed = await withinRateLimits([{ name: "search", key: session.user.id, limit: 60, windowSeconds: 60 }])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again in a moment." }

  try {
    return { ok: true, people: await searchPeople(parsed.data, session.user.id) }
  } catch (error) {
    console.error("[search] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Search is not working right now. Try again." }
  }
}

/**
 * Remembers a submitted search or an opened profile in the viewer's own
 * Recent list. The owner is always the session user.
 */
export async function recordSearchAction(input: unknown): Promise<SimpleResult> {
  const parsed = recordSearchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid", message: "Could not save that search." }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to search." }

  const allowed = await withinRateLimits([{ name: "search-record", key: session.user.id, limit: 60, windowSeconds: 60 }])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again in a moment." }

  try {
    if (parsed.data.kind === "query") await recordQuery(session.user.id, parsed.data.query)
    else await recordProfileVisit(session.user.id, parsed.data.username)
    return { ok: true }
  } catch (error) {
    console.error("[search] record failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Could not save that search." }
  }
}

/** Clear search history. No input: it deletes the session user's own rows and nobody else's. */
export async function clearSearchHistoryAction(): Promise<SimpleResult> {
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to continue." }

  const allowed = await withinRateLimits([
    { name: "search-clear", key: session.user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Too many tries. Try again later." }

  try {
    await clearHistory(session.user.id)
    return { ok: true }
  } catch (error) {
    console.error("[search] clear failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Could not clear your history. Try again." }
  }
}
