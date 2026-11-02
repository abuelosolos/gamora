import { Suspense } from "react"
import { FeedList } from "@/components/feed/feed-list"
import { FeedTabs } from "@/components/feed/feed-tabs"
import { PostCardSkeleton } from "@/components/feed/post-card"
import { TopNavbar, TopNavbarSkeleton } from "@/components/layout/top-navbar"
import { getUser } from "@/server/auth/session"
import { listFeed } from "@/server/services/posts"
import { getProfileByUserId } from "@/server/services/profile"
import { feedTabSchema } from "@/server/validators/posts"

// Public: readable signed out. Everything that depends on the request (who is
// looking, which tab) sits inside Suspense, so the shell can render at once.
export const metadata = { title: "Feed" }

export default function FeedPage({ searchParams }: PageProps<"/feed">) {
  return (
    <Suspense fallback={<FeedFallback />}>
      <FeedContent searchParams={searchParams} />
    </Suspense>
  )
}

async function FeedContent({ searchParams }: { searchParams: PageProps<"/feed">["searchParams"] }) {
  const { tab: rawTab } = await searchParams
  const parsed = feedTabSchema.safeParse(Array.isArray(rawTab) ? rawTab[0] : rawTab)
  const tab = parsed.success ? parsed.data : "for-you"

  const user = await getUser()
  const [profile, page] = await Promise.all([
    user ? getProfileByUserId(user.id) : null,
    listFeed({ tab, cursor: null, viewerId: user?.id ?? null }),
  ])

  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar
        variant="home"
        viewer={
          user && profile ? { name: user.name, username: profile.username, avatarUrl: profile.avatarUrl } : null
        }
      />
      <FeedTabs active={tab} />
      {/* key resets the list (and its cursor) when the tab changes. */}
      <FeedList key={tab} tab={tab} initial={page} />
    </main>
  )
}

function FeedFallback() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <TopNavbarSkeleton />
      <FeedTabs active="for-you" />
      <div role="status" aria-label="Loading posts">
        <PostCardSkeleton />
        <PostCardSkeleton withImage={false} />
        <PostCardSkeleton />
      </div>
    </main>
  )
}
