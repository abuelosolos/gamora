import "server-only"
import { and, count, eq } from "drizzle-orm"
import { cache } from "react"
import { db } from "@/server/db"
import { follows, profile, user, type NewProfile } from "@/server/db/schema"

/** The profile row, or null when the user has not finished onboarding. */
export const getProfileByUserId = cache(async (userId: string) => {
  const rows = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1)
  return rows[0] ?? null
})

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.username, username))
    .limit(1)
  return rows.length > 0
}

/**
 * Sets the display name and creates the profile row in one atomic batch.
 * `userId` must come from the session, never from client input. A taken
 * username surfaces as a Postgres unique violation (see isUniqueViolation).
 */
export async function createProfileForUser(
  userId: string,
  displayName: string,
  values: Omit<NewProfile, "userId">
): Promise<void> {
  await db.batch([
    db.update(user).set({ name: displayName }).where(eq(user.id, userId)),
    db.insert(profile).values({ ...values, userId }),
  ])
}

/** What a profile page may show. No email, no user id, no admin flag. */
export interface PublicProfile {
  username: string
  name: string
  bio: string
  avatarUrl: string | null
  /** Art categories the artist created (not the onboarding interests). */
  categories: string[]
  followerCount: number
  followingCount: number
  /** Always 0 until the subscription feature exists (nothing can be subscribed to yet). */
  subscriberCount: number
  /** True when the signed-in viewer is looking at their own profile. Decided here. */
  isOwner: boolean
  viewerFollows: boolean
}

export async function getPublicProfile(username: string, viewerId: string | null): Promise<PublicProfile | null> {
  const [row] = await db
    .select({
      userId: profile.userId,
      username: profile.username,
      name: user.name,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      categories: profile.categories,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.username, username))
    .limit(1)
  if (!row) return null

  const isOwner = viewerId !== null && viewerId === row.userId
  const [followers, following, viewerRow] = await Promise.all([
    db.select({ n: count() }).from(follows).where(eq(follows.followingId, row.userId)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, row.userId)),
    viewerId && !isOwner
      ? db
          .select({ id: follows.followerId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, row.userId)))
          .limit(1)
      : Promise.resolve([] as { id: string }[]),
  ])

  return {
    username: row.username,
    name: row.name,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    categories: row.categories,
    followerCount: followers[0]?.n ?? 0,
    followingCount: following[0]?.n ?? 0,
    subscriberCount: 0,
    isOwner,
    viewerFollows: viewerRow.length > 0,
  }
}

/**
 * Layer 4: the row being changed is the session user's own. `userId` must come
 * from the session, never from client input; it is the WHERE clause of both
 * writes, so there is no way to name another user. Returns the previous avatar
 * URL so the caller can remove the old file, or null when there is no profile.
 * A taken username surfaces as a unique violation (see isUniqueViolation).
 */
export async function updateOwnProfile(
  userId: string,
  values: {
    displayName: string
    username: string
    bio: string
    avatarUrl: string | null
    categories: string[]
    location: string | null
    birthday: string | null
  }
): Promise<{ previousAvatarUrl: string | null } | null> {
  const current = await getProfileByUserId(userId)
  if (!current) return null

  await db.batch([
    db.update(user).set({ name: values.displayName }).where(eq(user.id, userId)),
    db
      .update(profile)
      .set({
        username: values.username,
        bio: values.bio,
        avatarUrl: values.avatarUrl,
        categories: values.categories,
        location: values.location,
        birthday: values.birthday,
      })
      .where(eq(profile.userId, userId)),
  ])
  return { previousAvatarUrl: current.avatarUrl }
}

/** Postgres unique_violation (23505), checking the error and its cause. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 3 && current; depth++) {
    if (typeof current === "object" && "code" in current && (current as { code?: unknown }).code === "23505") {
      return true
    }
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined
  }
  return false
}
