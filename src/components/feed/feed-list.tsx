"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { NewPostsPill } from "@/components/feed/new-posts-pill"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { useNewPosts } from "@/components/feed/use-new-posts"
import { Plus } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { loadFeedPageAction, loadProfilePostsAction } from "@/server/actions/posts"
import type { FeedPage, PostView } from "@/server/services/posts"
import type { FeedTab, ProfileTab } from "@/server/validators/posts"

/** The same post can show twice in Activity (posted, then liked), so the key includes what was done. */
function itemKey(post: PostView): string {
  return `${post.id}:${post.via?.kind ?? ""}`
}

/** Where the posts come from: a feed tab, or one artist's profile. */
export type FeedSource = { kind: "feed"; tab: FeedTab; genres?: string[] } | { kind: "profile"; username: string; isOwner: boolean; tab: ProfileTab }

export interface FeedListProps {
  source: FeedSource
  initial: FeedPage
}

/**
 * The posts of one feed tab or one profile. The first page comes from the server; the next
 * pages load by cursor when the end of the list scrolls into view, or when the
 * reader presses the button after an error.
 */
function FeedList({ source, initial }: FeedListProps) {
  const [items, setItems] = React.useState<PostView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const sentinel = React.useRef<HTMLDivElement>(null)
  const busy = React.useRef(false)
  const router = useRouter()
  const [, startRefresh] = React.useTransition()
  const newPosts = useNewPosts({
    enabled: source.kind === "feed",
    tab: source.kind === "feed" ? source.tab : "for-you",
    genres: source.kind === "feed" ? source.genres : undefined,
    topPostId: items[0]?.id ?? null,
  })

  // Pill pressed: back to the top and fetch the feed again (the list takes the new first page).
  const showNewPosts = React.useCallback(() => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const behavior = smooth ? "smooth" : "instant"
    window.scrollTo({ top: 0, behavior })
    document.querySelector('[data-slot="phone-frame"]')?.scrollTo({ top: 0, behavior })
    startRefresh(() => router.refresh())
  }, [router])

  // A refresh (pull down, or router.refresh) brings a new first page from the server: show it.
  const lastInitial = React.useRef(initial)
  React.useEffect(() => {
    if (lastInitial.current === initial) return
    lastInitial.current = initial
    setItems(initial.items)
    setCursor(initial.nextCursor)
    setStatus("idle")
    setErrorMessage("")
  }, [initial])

  const loadMore = React.useCallback(async () => {
    if (busy.current || !cursor) return
    busy.current = true
    setStatus("loading")
    const result =
      source.kind === "feed"
        ? await loadFeedPageAction(source.tab, cursor, source.genres)
        : await loadProfilePostsAction(source.username, cursor, source.tab)
    if (result.ok) {
      setItems((current) => {
        const seen = new Set(current.map(itemKey))
        return [...current, ...result.page.items.filter((post) => !seen.has(itemKey(post)))]
      })
      setCursor(result.page.nextCursor)
      setStatus("idle")
    } else {
      setErrorMessage(result.message)
      setStatus("error")
    }
    busy.current = false
  }, [cursor, source])

  React.useEffect(() => {
    const node = sentinel.current
    if (!node || !cursor || status !== "idle") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, status, loadMore])

  if (items.length === 0) {
    if (source.kind === "profile" && source.tab !== "posts") {
      const empty = {
        activity: ["No activity yet", "Posts, replies, reposts and likes will show up here."],
        replies: ["No replies yet", "Replies will show up here."],
        likes: ["No likes yet", "Posts liked will show up here."],
        reposts: ["No reposts yet", "Reposts will show up here."],
        subscribed: ["Nothing here yet", "Subscribed posts will show up here."],
      }[source.tab]
      return <EmptyState title={empty[0]} description={empty[1]} />
    }
    if (source.kind === "profile") {
      return source.isOwner ? (
        <EmptyState
          title="You have not posted yet"
          description="Share your first piece and it will show up here."
          action={
            <Button asChild>
              <Link href="/create">
                <Plus aria-hidden="true" />
                Create post
              </Link>
            </Button>
          }
        />
      ) : (
        <EmptyState title="No posts yet" description="When this artist posts, you will see it here." />
      )
    }
    if (source.tab === "for-you" && source.genres && source.genres.length > 0) {
      return (
        <EmptyState
          title="No posts in these genres yet"
          description="Try another genre, or reset the filter to see everything."
          action={
            <Button asChild>
              <Link href="/feed">Reset filter</Link>
            </Button>
          }
        />
      )
    }
    return source.tab === "following" ? (
      <EmptyState
        title="Nothing from people you follow yet"
        description="Posts from artists you follow will show up here."
      />
    ) : (
      <EmptyState
        title="No posts yet"
        description="Be the first to share what you have been working on."
        action={
          <Button asChild>
            <Link href="/create">
              <Plus aria-hidden="true" />
              Create post
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      {newPosts ? <NewPostsPill found={newPosts} onPress={showNewPosts} /> : null}
      <ul className="flex flex-col">
        {items.map((post) => (
          <li key={itemKey(post)}>
            <PostCard post={post} onDeleted={() => setItems((current) => current.filter((p) => p.id !== post.id))} />
          </li>
        ))}
      </ul>

      {cursor ? <div ref={sentinel} aria-hidden="true" className="h-px" /> : null}

      {status === "loading" ? (
        <div role="status" aria-label="Loading more posts">
          <PostCardSkeleton />
        </div>
      ) : null}

      {status === "error" ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-5 py-6 text-center">
          <p className="text-body-sm text-textSecondary">{errorMessage || "Could not load more posts."}</p>
          <Button variant="outline" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!cursor ? (
        <p className="px-5 py-6 text-center text-caption text-textSecondary">You have doomscrolled to the end.</p>
      ) : null}
    </>
  )
}

export { FeedList }
