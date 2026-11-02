"use client"

import * as React from "react"
import { NotificationItem } from "@/components/activity/notification-item"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { loadActivityAction } from "@/server/actions/interactions"
import type { ActivityPage, NotificationView } from "@/server/services/interactions"
import type { ActivityFilter } from "@/server/validators/interactions"

const EMPTY: Record<ActivityFilter, { title: string; description: string }> = {
  all: {
    title: "No activity yet",
    description: "Likes, replies, reposts and new followers will show up here.",
  },
  likes: { title: "No likes yet", description: "When someone likes your art, you will see it here." },
  replies: { title: "No replies yet", description: "Replies to your posts will show up here." },
}

/** One page from the server, then more by cursor when the reader asks. */
function ActivityList({ filter, initial }: { filter: ActivityFilter; initial: ActivityPage }) {
  const [items, setItems] = React.useState<NotificationView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  async function loadMore() {
    if (!cursor || status === "loading") return
    setStatus("loading")
    const result = await loadActivityAction(filter, cursor)
    if (result.ok) {
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [...current, ...result.page.items.filter((item) => !seen.has(item.id))]
      })
      setCursor(result.page.nextCursor)
      setStatus("idle")
    } else {
      setErrorMessage(result.message)
      setStatus("error")
    }
  }

  if (items.length === 0) return <EmptyState {...EMPTY[filter]} />

  return (
    <>
      <ul className="flex flex-col">
        {items.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </ul>
      {status === "error" ? (
        <p role="alert" className="px-5 pt-4 text-center text-body-sm text-textSecondary">
          {errorMessage || "Could not load more activity."}
        </p>
      ) : null}
      {cursor ? (
        <div className="flex justify-center px-5 py-4">
          <Button variant="outline" size="sm" loading={status === "loading"} onClick={() => void loadMore()}>
            {status === "error" ? "Try again" : "Load more"}
          </Button>
        </div>
      ) : (
        <p className="px-5 py-6 text-center text-caption text-textSecondary">You are all caught up.</p>
      )}
    </>
  )
}

export { ActivityList }
