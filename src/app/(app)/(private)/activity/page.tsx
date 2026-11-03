import { Suspense } from "react"
import { ActivityHighlights } from "@/components/activity/activity-highlights"
import { ActivityFilters } from "@/components/activity/activity-filters"
import { ActivityList } from "@/components/activity/activity-list"
import { NotificationSkeleton } from "@/components/activity/notification-item"
import { TopNavbar, TopNavbarSkeleton } from "@/components/layout/top-navbar"
import { requireUser } from "@/server/auth/session"
import { listNotifications } from "@/server/services/interactions"
import { getProfileByUserId } from "@/server/services/profile"
import { activityFilterSchema } from "@/server/validators/interactions"

// Private: the (private) layout already requires a session and a profile.
// Reads the viewer and the filter, so everything sits inside Suspense.
export const metadata = { title: "Activity" }

export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    // The highlights live outside Suspense so they survive a refresh or a filter change.
    <ActivityHighlights>
      <Suspense fallback={<ActivityFallback />}>
        <ActivityContent searchParams={searchParams} />
      </Suspense>
    </ActivityHighlights>
  )
}

async function ActivityContent({ searchParams }: { searchParams: PageProps<"/activity">["searchParams"] }) {
  const { filter: rawFilter } = await searchParams
  const parsed = activityFilterSchema.safeParse(Array.isArray(rawFilter) ? rawFilter[0] : rawFilter)
  const filter = parsed.success ? parsed.data : "all"

  const user = await requireUser()
  const [profile, page] = await Promise.all([
    getProfileByUserId(user.id),
    listNotifications({ viewerId: user.id, filter, cursor: null }),
  ])

  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar
        variant="activity"
        viewer={profile ? { name: user.name, username: profile.username, avatarUrl: profile.avatarUrl } : null}
      />
      <ActivityFilters active={filter} />
      {/* key resets the list (and its cursor) when the filter changes. */}
      <ActivityList key={filter} filter={filter} initial={page} />
    </main>
  )
}

function ActivityFallback() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <TopNavbarSkeleton />
      <ActivityFilters active="all" />
      <div role="status" aria-label="Loading activity">
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
      </div>
    </main>
  )
}
