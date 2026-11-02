import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profile } from "@/server/db/schema";

/**
 * Session helpers. Layers 2 and 3 of the four protection layers:
 *   2. layouts call requireUser() / requireAdmin() and redirect.
 *   3. server actions call requireUserForAction() / requireAdminForAction()
 *      first and return a typed result instead of redirecting.
 * Layer 4 (ownership) lives in each query: put the owner in the WHERE clause
 *   db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, user.id)))
 * and treat zero affected rows as "not found or not yours" (same response).
 */

/** Read-only, safe on public pages. Cached for the duration of one request. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

/** The signed-in user, or null. Use on pages that anyone can read. */
export async function getUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** For layouts and pages: redirects to sign-in when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

/**
 * The admin flag is read from the profile row in the database, never from the
 * session cookie. Email is not verified here, so an email address (including
 * ADMIN_EMAILS) is not proof of identity and is not used for this check.
 */
const isAdminUser = cache(async (userId: string): Promise<boolean> => {
  const rows = await db
    .select({ isAdmin: profile.isAdmin })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  return rows[0]?.isAdmin === true;
});

/** For admin layouts and pages: signed-in users who are not admins go to the feed. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isAdminUser(user.id))) redirect("/feed");
  return user;
}

/**
 * Server actions called from client code do not redirect. They return this
 * shape and the client shows the sign-in sheet.
 */
export type Unauthorized = { ok: false; error: "unauthorized" };
export type Forbidden = { ok: false; error: "forbidden" };
export type AuthResult<T> = { ok: true; user: T } | Unauthorized;

export async function requireUserForAction(): Promise<AuthResult<SessionUser>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  return { ok: true, user: session.user };
}

export async function requireAdminForAction(): Promise<AuthResult<SessionUser> | Forbidden> {
  const result = await requireUserForAction();
  if (!result.ok) return result;
  if (!(await isAdminUser(result.user.id))) return { ok: false, error: "forbidden" };
  return result;
}
