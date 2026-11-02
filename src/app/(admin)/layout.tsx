import { requireAdmin } from "@/server/auth/session"

// Admin routes: signed-out visitors go to sign-in, signed-in non-admins go to
// the feed. The admin flag comes from the profile row in the database.
export const instant = false

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
