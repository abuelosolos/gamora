import { Suspense } from "react"
import { FeedList } from "@/components/feed/feed-list"
import { PostUploadBanner } from "@/components/feed/post-upload"
import { FeedTabs } from "@/components/feed/feed-tabs"
import { PostCardSkeleton } from "@/components/feed/post-card"
import { TopNavbar, TopNavbarSkeleton } from "@/components/layout/top-navbar"
import { getUser } from "@/server/auth/session"
import { listFeed } from "@/server/services/posts"
import { getProfileByUserId } from "@/server/services/profile"
import { feedGenresSchema, feedTabSchema } from "@/server/validators/posts"

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
  const { tab: rawTab, genres: rawGenres } = await searchParams
  const parsed = feedTabSchema.safeParse(Array.isArray(rawTab) ? rawTab[0] : rawTab)
  const tab = parsed.success ? parsed.data : "for-you"
  const genresParsed = feedGenresSchema.safeParse(Array.isArray(rawGenres) ? rawGenres[0] : rawGenres)
  // The filter only applies to For you; the URL keeps it so Following does not lose it.
  const genres = genresParsed.success ? genresParsed.data : []

  const user = await getUser()
  const [profile, page] = await Promise.all([
    user ? getProfileByUserId(user.id) : null,
    listFeed({ tab, genres, cursor: null, viewerId: user?.id ?? null }),
  ])

  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar
        variant="home"
        below={<FeedTabs active={tab} genres={genres} />}
        viewer={
          user && profile ? { name: user.name, username: profile.username, avatarUrl: profile.avatarUrl } : null
        }
      />
      <PostUploadBanner />
      {/* key resets the list (and its cursor) when the tab or the genres change. */}
      <FeedList key={`${tab}|${genres.join(",")}`} source={{ kind: "feed", tab, genres }} initial={page} />
    </main>
  )
}

function FeedFallback() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true">
      <TopNavbarSkeleton below={<FeedTabs active="for-you" />} />
      <div role="status" aria-label="Loading posts">
        <PostCardSkeleton />
        <PostCardSkeleton withImage={false} />
        <PostCardSkeleton />
      </div>
    </main>
  )
}
