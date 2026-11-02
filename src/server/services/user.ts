import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import { user } from "@/server/db/schema"

/** Used only on the server to choose between signing in and creating an account. Never returned to the client. */
export async function emailHasAccount(email: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  return rows.length > 0
}
