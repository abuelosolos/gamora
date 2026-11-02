import "server-only"
import { eq } from "drizzle-orm"
import { cache } from "react"
import { db } from "@/server/db"
import { profile, user, type NewProfile } from "@/server/db/schema"

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
