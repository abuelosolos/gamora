import { Suspense } from "react"
import Link from "next/link"
import { BookmarkList } from "@/components/feed/bookmark-list"
import { PostCardSkeleton } from "@/components/feed/post-card"
import { CaretLeft } from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { requireUser } from "@/server/auth/session"
import { listBookmarkedPosts } from "@/server/services/posts"

// Private: the (private) layout already requires a session and a profile.
// There is no Figma frame for this screen: it is the post card in a list under
// the shared top bar. Bookmarks are never shown to anyone but their owner.
export const metadata = { title: "Bookmarks" }

export default function BookmarksPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar
        title="Bookmarks"
        leading={
          <TopBarButton label="Back to feed" asChild>
            <Link href="/feed">
              <CaretLeft aria-hidden="true" />
            </Link>
          </TopBarButton>
        }
      />
      <Suspense
        fallback={
          <div role="status" aria-label="Loading bookmarks">
            <PostCardSkeleton />
            <PostCardSkeleton withImage={false} />
          </div>
        }
      >
        <BookmarksContent />
      </Suspense>
    </main>
  )
}

async function BookmarksContent() {
  const user = await requireUser()
  const page = await listBookmarkedPosts({ viewerId: user.id, cursor: null })
  return <BookmarkList initial={page} />
}
