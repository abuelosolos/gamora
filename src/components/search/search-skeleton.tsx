import { PersonRowSkeleton } from "@/components/search/person-row"
import { Skeleton } from "@/components/ui/skeleton"

/** Search while the page loads: the bar, the pills and a few rows. */
function SearchSkeleton() {
  return (
    <main role="status" aria-label="Loading search" className="flex flex-1 flex-col">
      <div className="flex items-center gap-2.5 px-5 py-2.5">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-11 flex-1 rounded-full" />
      </div>
      <div className="flex gap-3.5 px-5 py-2.5">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
      </div>
      <ul className="flex flex-col">
        <PersonRowSkeleton />
        <PersonRowSkeleton />
        <PersonRowSkeleton />
      </ul>
    </main>
  )
}

export { SearchSkeleton }
