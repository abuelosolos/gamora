import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import { user } from "@/server/db/schema"

/** The signed-in user's own account details. The email is only ever shown to its owner. */
export async function getAccountInfo(userId: string) {
  const rows = await db
    .select({ name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Deletes the user row. Every table that belongs to a user references it with
 * ON DELETE CASCADE, so this one statement (atomic in Postgres) also removes:
 * sessions and sign-in accounts, the profile, posts (and with them their
 * images, replies, likes, bookmarks, reposts), the user's own replies, likes,
 * follows, notifications, and job applications.
 * Returns false when there was no such user.
 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  const rows = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id })
  return rows.length > 0
}
