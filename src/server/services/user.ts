import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { account, user } from "@/server/db/schema"

/** Used only on the server to choose between signing in and creating an account. Never returned to the client. */
export async function emailHasAccount(email: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  return rows.length > 0
}

export type SignInMethod = "password" | "google" | "new"

/**
 * Which way an email signs in, and nothing more: "password" (has a password
 * login), "google" (an account without a password, which here means Google) or
 * "new" (no account). Only these three words ever leave the server. Reads
 * the account's provider and whether a password is set, never the password.
 */
export async function getSignInMethod(email: string): Promise<SignInMethod> {
  const rows = await db
    .select({ providerId: account.providerId, hasPassword: sql<boolean>`${account.password} is not null` })
    .from(user)
    .leftJoin(account, eq(account.userId, user.id))
    .where(eq(user.email, email))
  if (rows.length === 0) return "new"
  if (rows.some((row) => row.providerId === "credential" && row.hasPassword)) return "password"
  return "google"
}
