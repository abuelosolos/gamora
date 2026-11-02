import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { safeNextPath } from "@/lib/safe-redirect"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

export const metadata: Metadata = { title: "Set up your profile" }

// Reads the session and searchParams per request.
export const instant = false

/**
 * Landing point after every sign-in, sign-up and Google redirect. Users who
 * already have a profile go straight on to `next`; the rest finish setup.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const user = await requireUser()
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)

  if (await getProfileByUserId(user.id)) redirect(next)
  return <OnboardingFlow next={next} />
}
