import "server-only"
import { and, desc, eq, notInArray, sql, type SQL } from "drizzle-orm"
import { db } from "@/server/db"
import { profile, searchHistory, user } from "@/server/db/schema"
import { notBlockedWith } from "@/server/services/blocks"
import { SEARCH_HISTORY_MAX, SEARCH_RESULTS_MAX, type SearchInput } from "@/server/validators/search"

/** What a result may show. No email, no user id, no admin flag. */
export interface PersonResult {
  username: string
  name: string
  avatarUrl: string | null
  categories: string[]
}

/** "100%_" must search for those characters, not act as wildcards. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/**
 * People by display name or username, optionally narrowed to a category.
 * Every value is a bound parameter (no SQL is built from the text). Order:
 * exact username, then names/usernames that start with the text, then the rest,
 * alphabetical inside each group.
 */
export async function searchPeople(
  { query, category }: SearchInput,
  viewerId: string | null = null,
): Promise<PersonResult[]> {
  const conditions: SQL[] = []
  const hidden = notBlockedWith(viewerId, profile.userId)
  if (hidden) conditions.push(hidden)
  let rank: SQL = sql`0`

  if (query !== undefined) {
    const lowered = query.toLowerCase()
    const contains = `%${escapeLike(lowered)}%`
    const prefix = `${escapeLike(lowered)}%`
    conditions.push(
      sql`(${profile.username} like ${contains} escape '\\' or lower(${user.name}) like ${contains} escape '\\')`,
    )
    rank = sql`case
      when ${profile.username} = ${lowered} then 0
      when ${profile.username} like ${prefix} escape '\\' or lower(${user.name}) like ${prefix} escape '\\' then 1
      else 2
    end`
  }

  if (category !== undefined) {
    conditions.push(
      sql`exists (select 1 from unnest(${profile.categories}) as c(name) where lower(c.name) = ${category.toLowerCase()})`,
    )
  }

  return db
    .select({
      username: profile.username,
      name: user.name,
      avatarUrl: profile.avatarUrl,
      categories: profile.categories,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(and(...conditions))
    .orderBy(rank, profile.username)
    .limit(SEARCH_RESULTS_MAX)
}

/** The most used categories across profiles, for the pills. Shown in the casing most people use. */
export async function listPopularCategories(limit = 8): Promise<string[]> {
  const rows = await db.execute<{ name: string }>(sql`
    select min(c.name) as name
    from ${profile}, unnest(${profile.categories}) as c(name)
    group by lower(c.name)
    order by count(*) desc, lower(c.name)
    limit ${limit}
  `)
  return rows.rows.map((row) => row.name)
}

export interface RecentSearches {
  people: { username: string; name: string; avatarUrl: string | null }[]
  queries: string[]
}

/** The viewer's own history, newest first. */
export async function listHistory(userId: string): Promise<RecentSearches> {
  const [peopleRows, queryRows] = await Promise.all([
    db
      .select({ username: profile.username, name: user.name, avatarUrl: profile.avatarUrl })
      .from(searchHistory)
      .innerJoin(profile, eq(profile.userId, searchHistory.profileUserId))
      .innerJoin(user, eq(user.id, profile.userId))
      .where(and(eq(searchHistory.userId, userId), eq(searchHistory.kind, "profile")))
      .orderBy(desc(searchHistory.usedAt))
      .limit(SEARCH_HISTORY_MAX),
    db
      .select({ term: searchHistory.term })
      .from(searchHistory)
      .where(and(eq(searchHistory.userId, userId), eq(searchHistory.kind, "query")))
      .orderBy(desc(searchHistory.usedAt))
      .limit(SEARCH_HISTORY_MAX),
  ])
  return {
    people: peopleRows,
    queries: queryRows.flatMap((row) => (row.term ? [row.term] : [])),
  }
}

/** Keeps only the newest SEARCH_HISTORY_MAX entries of one kind for one person. */
async function prune(userId: string, kind: "query" | "profile"): Promise<void> {
  const keep = await db
    .select({ id: searchHistory.id })
    .from(searchHistory)
    .where(and(eq(searchHistory.userId, userId), eq(searchHistory.kind, kind)))
    .orderBy(desc(searchHistory.usedAt))
    .limit(SEARCH_HISTORY_MAX)
  if (keep.length < SEARCH_HISTORY_MAX) return
  await db
    .delete(searchHistory)
    .where(
      and(
        eq(searchHistory.userId, userId),
        eq(searchHistory.kind, kind),
        notInArray(searchHistory.id, keep.map((row) => row.id)),
      ),
    )
}

/** Saves or bumps a text search. `userId` comes from the session. */
export async function recordQuery(userId: string, query: string): Promise<void> {
  const key = query.toLowerCase()
  await db
    .insert(searchHistory)
    .values({ userId, kind: "query", key, term: query })
    .onConflictDoUpdate({
      target: [searchHistory.userId, searchHistory.kind, searchHistory.key],
      set: { term: query, usedAt: new Date() },
    })
  await prune(userId, "query")
}

/**
 * Saves or bumps an opened profile, looked up by username. Returns false when
 * there is no such profile. Opening your own profile is not remembered.
 */
export async function recordProfileVisit(userId: string, username: string): Promise<boolean> {
  const [target] = await db.select({ userId: profile.userId }).from(profile).where(eq(profile.username, username)).limit(1)
  if (!target) return false
  if (target.userId === userId) return true
  await db
    .insert(searchHistory)
    .values({ userId, kind: "profile", key: target.userId, profileUserId: target.userId })
    .onConflictDoUpdate({
      target: [searchHistory.userId, searchHistory.kind, searchHistory.key],
      set: { usedAt: new Date() },
    })
  await prune(userId, "profile")
  return true
}

/** Clears everything the person has searched. Only their own rows. */
export async function clearHistory(userId: string): Promise<void> {
  await db.delete(searchHistory).where(eq(searchHistory.userId, userId))
}

