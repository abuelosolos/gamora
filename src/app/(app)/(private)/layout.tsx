import { redirect } from "next/navigation"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

// Layer 2 of 4: the real check. The proxy only looks for a cookie; this loads
// and validates the session on the server. A new page added under (private)
// is protected by default. The session is read per request, so this layout
// cannot be prerendered.
export const instant = false

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  // A signed-in user without a profile row has not finished onboarding.
  if (!(await getProfileByUserId(user.id))) redirect("/onboarding")
  return children
}
