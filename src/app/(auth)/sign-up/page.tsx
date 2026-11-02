import { redirect } from "next/navigation"
import { safeNextPath } from "@/lib/safe-redirect"

// Sign-up and sign-in are one flow now. Old links land on /sign-in.
export const instant = false

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)
  redirect(`/sign-in?next=${encodeURIComponent(next)}`)
}
