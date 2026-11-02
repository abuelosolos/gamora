import { Suspense } from "react"
import { CreatePostForm } from "@/components/feed/create-post-form"
import { TopBar } from "@/components/layout/top-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

// Private: the (private) layout is the real gate, requireUser() is the second look.
export const metadata = { title: "Create post" }

export default function CreatePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<CreateFallback />}>
        <CreateContent />
      </Suspense>
    </main>
  )
}

async function CreateContent() {
  const user = await requireUser()
  const profile = await getProfileByUserId(user.id)
  return <CreatePostForm name={user.name} avatarUrl={profile?.avatarUrl ?? null} />
}

function CreateFallback() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col">
      <TopBar trailing={<Skeleton className="h-7 w-12.5" />} />
      <div className="flex flex-col gap-2.5 px-5 py-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="flex items-center gap-3 px-5 py-2.5">
        <Skeleton className="size-9.5 rounded-full" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  )
}
