"use client"

import * as React from "react"
import { getUnreadCountAction } from "@/server/actions/interactions"

const POLL_MS = 45_000

/** Fired after notifications are marked read, so the badge asks the server again. */
export const UNREAD_CHANGED_EVENT = "gamora:unread-changed"

/**
 * Number of unread notifications for the bell badge. Asks the server on mount,
 * every 45s while the tab is visible, when the tab comes back, and when the
 * Activity page reports it marked things read. `paused` (the viewer is on the
 * Activity page) stops the polling and shows 0; leaving the page waits for the
 * read event instead of racing it.
 */
export function useUnreadCount({ paused }: { paused: boolean }): number {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (paused) return
    let cancelled = false

    async function check() {
      if (document.hidden) return
      const result = await getUnreadCountAction()
      if (cancelled || !result.ok) return
      setCount(result.count)
    }

    // First look when the nav appears; later looks are triggered by the timer and events.
    const first = paused ? undefined : setTimeout(() => void check(), 0)
    const timer = setInterval(() => void check(), POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void check()
    }
    const onChanged = () => void check()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener(UNREAD_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener(UNREAD_CHANGED_EVENT, onChanged)
    }
  }, [paused])

  return paused ? 0 : count
}
