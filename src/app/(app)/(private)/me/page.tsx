import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

// The Profile tab of the bottom nav. The nav has no session, so it points here
// and this page forwards to the signed-in user's own profile.
export default function MePage() {
  return (
    <Suspense fallback={null}>
      <MeRedirect />
    </Suspense>
  )
}

async function MeRedirect(): Promise<React.ReactNode> {
  const user = await requireUser()
  const profile = await getProfileByUserId(user.id)
  redirect(profile ? `/u/${profile.username}` : "/onboarding")
}
