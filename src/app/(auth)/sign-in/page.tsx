import type { Metadata } from "next"
import { CredentialsForm } from "@/components/auth/credentials-form"
import { safeNextPath } from "@/lib/safe-redirect"
import { checkEmailAction, continueWithEmailAction } from "@/server/actions/auth"

export const metadata: Metadata = { title: "Continue with email" }

// Reads searchParams per request.
export const instant = false

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)

  return (
    <CredentialsForm
      action={continueWithEmailAction}
      checkEmail={checkEmailAction}
      next={next}
    />
  )
}
