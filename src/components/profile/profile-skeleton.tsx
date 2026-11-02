import { PostCardSkeleton } from "@/components/feed/post-card"
import { TopNavbar } from "@/components/layout/top-navbar"
import { Skeleton } from "@/components/ui/skeleton"

/** The profile while it loads: same bar, head, buttons and tab strip, so nothing jumps. */
function ProfileSkeleton() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <TopNavbar variant="profile" backHref="/feed" />
      <div role="status" aria-label="Loading profile">
        <div className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex gap-4 px-5 pt-2.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex flex-col gap-1.5 px-5 py-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex gap-3 px-5 py-2.5">
          <Skeleton className="h-11 flex-1 rounded-ui-sm" />
          <Skeleton className="h-11 flex-1 rounded-ui-sm" />
        </div>
      </div>
      <div aria-hidden="true" className="flex min-h-11 items-center gap-3.75 px-5">
        <Skeleton className="h-3 w-11" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div aria-hidden="true">
        <PostCardSkeleton />
        <PostCardSkeleton withImage={false} />
      </div>
    </main>
  )
}

export { ProfileSkeleton }
