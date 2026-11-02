"use client"

import * as React from "react"
import Link from "next/link"
import { DotsThreeVertical, Trash, User, UserFill } from "@/components/icons"
import { useFollow } from "@/components/feed/use-follow"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { formatPostDate } from "@/lib/format-post-date"
import { createCommentAction, deleteCommentAction, loadCommentsAction } from "@/server/actions/interactions"
import type { CommentView, CommentsPage } from "@/server/services/interactions"
import { COMMENT_BODY_MAX } from "@/server/validators/interactions"

/**
 * Comments under a post. No Figma frame exists for this, so it is built from
 * the existing pieces: Avatar, Textarea, Button and the post card's header
 * text styles. See the build log for the deviation note.
 *
 * Writing a comment shows it at once and takes it back (with the text restored
 * in the box) if the server refuses. Deleting your own comment works the same
 * way in reverse. The count shown is the database count from the last answer.
 */
export interface CommentViewer {
  name: string
  username: string
  avatarUrl: string | null
}

export interface CommentSectionProps {
  postId: string
  initial: CommentsPage
  initialCount: number
  /** Null when signed out: the composer becomes a sign-in link. */
  viewer: CommentViewer | null
}

function CommentItem({
  comment,
  onDelete,
  pending,
}: {
  comment: CommentView
  onDelete: (comment: CommentView) => void
  pending: boolean
}) {
  const { author } = comment
  return (
    <li
      id={`comment-${comment.id}`}
      className="flex gap-3 border-b border-borderDefault px-5 py-2.5"
      aria-busy={pending}
    >
      <Link
        href={`/u/${author.username}`}
        aria-label={`${author.name}, profile`}
        className="shrink-0 self-start rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
      >
        <Avatar src={author.avatarUrl} name={author.name} className="size-9" />
      </Link>
      {/* The comment starts on the name's left edge, with the text under the name line. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-body text-textSecondary">
            <Link
              href={`/u/${author.username}`}
              className="rounded-ui-sm text-body font-medium text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
            >
              {author.name}
            </Link>{" "}
            @{author.username} • <time dateTime={comment.createdAt}>{formatPostDate(comment.createdAt)}</time>
          </p>
          <CommentMenu comment={comment} pending={pending} onDelete={onDelete} />
        </div>
        <p className="text-body-sm wrap-break-word whitespace-pre-wrap text-textPrimary">{comment.body}</p>
      </div>
    </li>
  )
}

/**
 * The three-dot menu on every comment. Yours: Delete. Someone else's: Follow
 * or Unfollow, and Report (Phase 8, so shown disabled). The server checks
 * ownership again on delete.
 */
function CommentMenu({
  comment,
  pending,
  onDelete,
}: {
  comment: CommentView
  pending: boolean
  onDelete: (comment: CommentView) => void
}) {
  const { following, toggle } = useFollow(comment.author.username, comment.followsAuthor)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Comment options"
          disabled={pending}
          className="-my-2 -mr-2.5 shrink-0"
        >
          <DotsThreeVertical aria-hidden="true" className="size-6 text-textSecondary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {comment.isOwner ? (
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 px-3 text-body-sm"
            onSelect={() => onDelete(comment)}
          >
            <Trash aria-hidden="true" />
            Delete comment
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem className="min-h-11 px-3 text-body-sm" onSelect={() => void toggle()}>
              {following ? <UserFill aria-hidden="true" /> : <User aria-hidden="true" />}
              {following ? "Unfollow" : "Follow"} @{comment.author.username}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="min-h-11 px-3 text-body-sm">
              Report, coming soon
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CommentSection({ postId, initial, initialCount, viewer }: CommentSectionProps) {
  const { toast } = useToast()
  const [items, setItems] = React.useState<CommentView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [count, setCount] = React.useState(initialCount)
  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set())
  const [more, setMore] = React.useState<"idle" | "loading" | "error">("idle")
  const sendBusy = React.useRef(false)

  const trimmed = draft.trim()
  const tooLong = trimmed.length > COMMENT_BODY_MAX
  // The counter only appears when the limit is near, so the box stays one line tall.
  const showCount = trimmed.length >= COMMENT_BODY_MAX - 100

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!viewer || sendBusy.current || trimmed.length === 0 || tooLong) return
    sendBusy.current = true
    setSending(true)

    const text = trimmed
    const tempId = `pending-${crypto.randomUUID()}`
    const optimistic: CommentView = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      author: {
        name: viewer.name,
        username: viewer.username,
        avatarUrl: viewer.avatarUrl,
      },
      isOwner: true,
      followsAuthor: false,
    }
    setItems((current) => [...current, optimistic])
    setCount((current) => current + 1)
    setDraft("")

    const rollback = (message: string) => {
      setItems((current) => current.filter((comment) => comment.id !== tempId))
      setCount((current) => Math.max(0, current - 1))
      setDraft(text)
      toast({ variant: "error", title: message })
    }

    try {
      const result = await createCommentAction({ postId, body: text })
      if (result.ok) {
        setItems((current) => current.map((comment) => (comment.id === tempId ? result.comment : comment)))
        setCount(result.commentCount)
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

  async function remove(comment: CommentView) {
    if (deleting.has(comment.id) || comment.id.startsWith("pending-")) return
    const index = items.findIndex((item) => item.id === comment.id)
    setDeleting((current) => new Set(current).add(comment.id))
    setItems((current) => current.filter((item) => item.id !== comment.id))
    setCount((current) => Math.max(0, current - 1))

    const rollback = (message: string) => {
      setItems((current) => {
        if (current.some((item) => item.id === comment.id)) return current
        const next = [...current]
        next.splice(Math.min(index, next.length), 0, comment)
        return next
      })
      setCount((current) => current + 1)
      toast({ variant: "error", title: message })
    }

    try {
      const result = await deleteCommentAction(comment.id)
      if (result.ok) setCount(result.commentCount)
      else rollback(result.message)
    } catch {
      rollback("Something went wrong. Try again.")
    } finally {
      setDeleting((current) => {
        const next = new Set(current)
        next.delete(comment.id)
        return next
      })
    }
  }

  async function loadMore() {
    if (!cursor || more === "loading") return
    setMore("loading")
    const result = await loadCommentsAction(postId, cursor)
    if (result.ok) {
      setItems((current) => {
        const seen = new Set(current.map((comment) => comment.id))
        return [...current, ...result.page.items.filter((comment) => !seen.has(comment.id))]
      })
      setCursor(result.page.nextCursor)
      setMore("idle")
    } else {
      setMore("error")
    }
  }

  // Two siblings, not one wrapper: a sticky element cannot leave its parent, so
  // the composer must sit directly in the page, beside the post, not inside the
  // comments section that starts below it.
  return (
    <>
      <section id="comments" aria-labelledby="comments-heading" className="flex flex-1 scroll-mt-14 flex-col">
        {/* Not shown: the list starts at the first comment. Kept for screen readers. */}
        <h2 id="comments-heading" className="sr-only">
          Comments{count > 0 ? ` (${count})` : ""}
        </h2>

        {items.length > 0 ? (
          <ul className="border-t border-borderDefault">
            {items.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onDelete={remove} pending={deleting.has(comment.id)} />
            ))}
          </ul>
        ) : null}

        {cursor ? (
          <div className="flex flex-col items-center gap-2 px-5 py-4">
            {more === "error" ? (
              <p role="alert" className="text-body-sm text-textSecondary">
                Could not load more comments.
              </p>
            ) : null}
            <Button variant="outline" size="sm" loading={more === "loading"} onClick={() => void loadMore()}>
              {more === "error" ? "Try again" : "Load more comments"}
            </Button>
          </div>
        ) : null}
      </section>

      {/* Stays at the bottom of the screen: the section above grows to push it down on short posts, and it stays stuck there while the post and comments scroll. */}
      <div className="sticky bottom-0 z-10 border-t border-borderDefault bg-bgDefault px-5 py-3">
        {viewer ? (
          <form onSubmit={send} className="flex flex-col gap-1.5">
            {/* One pill: avatar on the left, text box in the middle, Reply on the right. */}
            <div className="flex min-h-11 items-center gap-2 rounded-full border border-borderStrong bg-bgDefault p-1 pr-1.5 transition-colors focus-within:border-accentDefault focus-within:ring-2 focus-within:ring-accentDefault">
              <Avatar src={viewer.avatarUrl} name={viewer.name} className="size-9" />
              <label htmlFor="comment-body" className="sr-only">
                Write a reply
              </label>
              <input
                id="comment-body"
                type="text"
                autoComplete="off"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a reply"
                aria-invalid={tooLong || undefined}
                aria-describedby={showCount ? "comment-count" : undefined}
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
              <p
                id="comment-count"
                className={`px-3 text-caption ${tooLong ? "text-statusError" : "text-textSecondary"}`}
              >
                {trimmed.length}/{COMMENT_BODY_MAX}
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
            to comment.
          </p>
        )}
      </div>
    </>
  )
}

/** Loading placeholder with the same layout as the section. */
function CommentSectionSkeleton() {
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

export { CommentSection, CommentSectionSkeleton }
