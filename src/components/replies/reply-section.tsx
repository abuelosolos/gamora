"use client"

import * as React from "react"
import Link from "next/link"
import { PostCard } from "@/components/feed/post-card"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { createReplyAction, loadRepliesAction } from "@/server/actions/interactions"
import type { RepliesPage } from "@/server/services/interactions"
import type { PostView } from "@/server/services/posts"
import { REPLY_BODY_MAX } from "@/server/validators/interactions"

/**
 * Replies under a post. A reply is a post that points at its parent, so each
 * one is a full PostCard with like, reply, repost, bookmark and share. No
 * Figma frame exists for the post page's list, so the composer is built from
 * the existing pieces (Avatar, Button); see the build log.
 *
 * Writing a reply shows it at once and takes it back (with the text restored in
 * the box) if the server refuses. Deleting your own reply goes through the
 * card's menu. The count shown is the database count from the last answer.
 */
export interface ReplyViewer {
  name: string
  username: string
  avatarUrl: string | null
}

export interface ReplySectionProps {
  postId: string
  initial: RepliesPage
  initialCount: number
  /** Null when signed out: the composer becomes a sign-in link. */
  viewer: ReplyViewer | null
}

function ReplySection({ postId, initial, initialCount, viewer }: ReplySectionProps) {
  const { toast } = useToast()
  const [items, setItems] = React.useState<PostView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [count, setCount] = React.useState(initialCount)
  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [more, setMore] = React.useState<"idle" | "loading" | "error">("idle")
  const sendBusy = React.useRef(false)

  const trimmed = draft.trim()
  const tooLong = trimmed.length > REPLY_BODY_MAX
  // The counter only appears when the limit is near, so the box stays one line tall.
  const showCount = trimmed.length >= REPLY_BODY_MAX - 100

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!viewer || sendBusy.current || trimmed.length === 0 || tooLong) return
    sendBusy.current = true
    setSending(true)

    const text = trimmed
    const tempId = `pending-${crypto.randomUUID()}`
    const optimistic: PostView = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      author: { name: viewer.name, username: viewer.username, avatarUrl: viewer.avatarUrl },
      images: [],
      isOwner: true,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      viewer: { liked: false, bookmarked: false, reposted: false, followsAuthor: false },
    }
    setItems((current) => [...current, optimistic])
    setCount((current) => current + 1)
    setDraft("")

    const rollback = (message: string) => {
      setItems((current) => current.filter((reply) => reply.id !== tempId))
      setCount((current) => Math.max(0, current - 1))
      setDraft(text)
      toast({ variant: "error", title: message })
    }

    try {
      const result = await createReplyAction({ postId, body: text })
      if (result.ok) {
        setItems((current) => current.map((reply) => (reply.id === tempId ? result.reply : reply)))
        setCount(result.replyCount)
      } else {
        rollback(result.message)
      }
    } catch {
      rollback("Something went wrong. Try again.")
    } finally {
      sendBusy.current = false
      setSending(false)
    }
  }

  async function loadMore() {
    if (!cursor || more === "loading") return
    setMore("loading")
    const result = await loadRepliesAction(postId, cursor)
    if (result.ok) {
      setItems((current) => {
        const seen = new Set(current.map((reply) => reply.id))
        return [...current, ...result.page.items.filter((reply) => !seen.has(reply.id))]
      })
      setCursor(result.page.nextCursor)
      setMore("idle")
    } else {
      setMore("error")
    }
  }

  // Two siblings, not one wrapper: a sticky element cannot leave its parent, so
  // the composer must sit directly in the page, beside the post, not inside the
  // replies section that starts below it.
  return (
    <>
      <section id="replies" aria-labelledby="replies-heading" className="flex flex-1 scroll-mt-14 flex-col">
        {/* Not shown: the list starts at the first reply. Kept for screen readers. */}
        <h2 id="replies-heading" className="sr-only">
          Replies{count > 0 ? ` (${count})` : ""}
        </h2>

        {items.length > 0 ? (
          <ul className="border-t border-borderDefault">
            {items.map((reply) => (
              <li key={reply.id} id={`reply-${reply.id}`} aria-busy={reply.id.startsWith("pending-")}>
                <PostCard
                  post={reply}
                  onDeleted={() => {
                    setItems((current) => current.filter((item) => item.id !== reply.id))
                    setCount((current) => Math.max(0, current - 1))
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {cursor ? (
          <div className="flex flex-col items-center gap-2 px-5 py-4">
            {more === "error" ? (
              <p role="alert" className="text-body-sm text-textSecondary">
                Could not load more replies.
              </p>
            ) : null}
            <Button variant="outline" size="sm" loading={more === "loading"} onClick={() => void loadMore()}>
              {more === "error" ? "Try again" : "Load more replies"}
            </Button>
          </div>
        ) : null}
      </section>

      {/* Stays at the bottom of the screen: the section above grows to push it down on short posts, and it stays stuck there while the post and replies scroll. */}
      <div className="sticky bottom-0 z-10 border-t border-borderDefault bg-bgDefault px-5 py-3">
        {viewer ? (
          <form onSubmit={send} className="flex flex-col gap-1.5">
            {/* One pill: avatar on the left, text box in the middle, Reply on the right. */}
            <div className="flex min-h-11 items-center gap-2 rounded-full border border-borderStrong bg-bgDefault p-1 pr-1.5 transition-colors focus-within:border-accentDefault focus-within:ring-2 focus-within:ring-accentDefault">
              <Avatar src={viewer.avatarUrl} name={viewer.name} className="size-9" />
              <label htmlFor="reply-body" className="sr-only">
                Write a reply
              </label>
              <input
                id="reply-body"
                type="text"
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a reply"
                aria-invalid={tooLong || undefined}
                aria-describedby={showCount ? "reply-count" : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-body-sm text-textPrimary outline-none placeholder:text-textSecondary"
              />
              <Button
                type="submit"
                size="xs"
                loading={sending}
                disabled={trimmed.length === 0 || tooLong}
                className="min-h-8 rounded-full px-4 py-0 text-textOnAccent"
              >
                <span className="text-body-sm">Reply</span>
              </Button>
            </div>
            {showCount ? (
              <p id="reply-count" className={`px-3 text-caption ${tooLong ? "text-statusError" : "text-textSecondary"}`}>
                {trimmed.length}/{REPLY_BODY_MAX}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-body-sm text-textSecondary">
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/post/${postId}`)}`}
              className="rounded-ui-sm text-accentDefault underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accentDefault"
            >
              Sign in
            </Link>{" "}
            to reply.
          </p>
        )}
      </div>
    </>
  )
}

/** Loading placeholder with the same layout as the section. */
function ReplySectionSkeleton() {
  return (
    <div className="flex flex-col gap-4 border-t border-borderDefault px-5 py-4" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-3">
          <Skeleton className="size-7.5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { ReplySection, ReplySectionSkeleton }
