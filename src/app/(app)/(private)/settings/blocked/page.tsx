import { Suspense } from "react"
import { TopNavbar } from "@/components/layout/top-navbar"
import { BlockedList } from "@/components/settings/blocked-list"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { listBlockedUsers } from "@/server/services/blocks"

// No Figma frame: built from the Settings rows and the people-list layout.
// Private: the (private) layout is the gate, and the list is the signed-in
// user's own (from the session, never the URL).
export const metadata = { title: "Blocked users" }

export default function BlockedUsersPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="page" backHref="/settings" title="Blocked users" />
      <Suspense fallback={<BlockedFallback />}>
        <BlockedContent />
      </Suspense>
    </main>
  )
}

async function BlockedContent() {
  const user = await requireUser()
  const people = await listBlockedUsers(user.id)
  return <BlockedList people={people} />
}

function BlockedFallback() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="flex flex-col">
      {["a", "b", "c", "d"].map((key) => (
        <div key={key} className="flex min-h-14 items-center gap-3 px-5 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
