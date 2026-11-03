"use client"

import * as React from "react"
import { formatPostDate, formatPostStamp, formatPostTime } from "@/lib/format-post-date"

/**
 * One shared 1-second clock for every PostTime on the page. It runs only while
 * something is subscribed and the tab is visible. Each PostTime reads a string,
 * so it re-renders only when its own text changes (every second for the first
 * minute, then once a minute, then once an hour, then never).
 */
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function notify() {
  listeners.forEach((listener) => listener())
}

function start() {
  if (timer === undefined && !document.hidden) timer = setInterval(notify, 1000)
}

function stop() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}

function onVisibility() {
  if (document.hidden) {
    stop()
  } else {
    notify() // catch up at once after the tab was in the background
    start()
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    document.addEventListener("visibilitychange", onVisibility)
    start()
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibility)
      stop()
    }
  }
}

export interface PostTimeProps {
  /** ISO time the post was created. */
  iso: string
}

function PostTime({ iso }: PostTimeProps) {
  // Server and first client render use the date (same text everywhere, so no
  // hydration mismatch); the live age replaces it right after hydration.
  const text = React.useSyncExternalStore(
    subscribe,
    () => formatPostTime(iso),
    () => formatPostDate(iso)
  )
  return (
    <time dateTime={iso} title={formatPostStamp(iso)}>
      {text}
    </time>
  )
}

export { PostTime }
