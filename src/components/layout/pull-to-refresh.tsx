"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { LogoFold } from "@/components/shared/logo-fold"

/**
 * Pull down at the top of a list screen to refresh it. The content moves down
 * and the origami logo (LogoFold) appears in the gap, unfolding as you pull.
 * Let go past the line and the content stays put while the logo folds and
 * unfolds until the screen has been fetched again, then it slides back up.
 *
 * Touch, and on desktop a held mouse button. It starts only when the screen is already at its very top and the
 * first movement is mostly downward, so sideways swipes (image rows, tabs) and
 * normal scrolling are left alone. Screens with forms are not listed in
 * REFRESHABLE, so a downward drag never fights typing. The refresh is
 * router.refresh(): the server data is fetched again in place (FeedList takes
 * the new first page), scroll position and theme stay.
 *
 * Tune the feel with the constants below.
 */
const THRESHOLD = 56 // px the content must be pulled to count as a refresh
const MAX_PULL = 96 // the content never moves further than this
const RESISTANCE = 0.7 // content moves this much of the finger's distance
const START_SLOP = 8 // finger travel before the gesture is classified
const MIN_REFRESH_MS = 600 // the logo is shown at least this long
const GIVE_UP_MS = 10_000 // never hold the screen down longer than this
const COOLDOWN_MS = 1000 // ignore a new pull this soon after a refresh

const REFRESHABLE = ["/feed", "/activity", "/jobs", "/u/", "/post/", "/bookmarks"]

function isRefreshable(pathname: string): boolean {
  // The apply screen is a form: a downward drag must never fight typing.
  if (pathname.endsWith("/apply")) return false
  return REFRESHABLE.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

type Mode = "none" | "pending" | "pull" | "ignore"

function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const offset = useMotionValue(0)
  const progress = useTransform(offset, [0, THRESHOLD], [0, 1], { clamp: true })
  const [refreshing, setRefreshing] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const startedAt = React.useRef(0)
  const cooldownUntil = React.useRef(0)
  const enabled = isRefreshable(pathname)
  const stateRef = React.useRef({ enabled, refreshing })
  React.useEffect(() => {
    stateRef.current = { enabled, refreshing }
  }, [enabled, refreshing])

  // Touch gesture.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const frame = root.closest<HTMLElement>('[data-slot="phone-frame"]')
    // The browser's own pull-to-refresh and bounce would fight this one.
    const html = document.documentElement
    const previous = html.style.overscrollBehaviorY
    html.style.overscrollBehaviorY = "contain"

    const scrollTop = () => {
      // From md up the frame scrolls itself; on phones the window does.
      if (frame && getComputedStyle(frame).overflowY === "auto") return frame.scrollTop
      return document.scrollingElement?.scrollTop ?? 0
    }

    let mode: Mode = "none"
    let startX = 0
    let startY = 0
    let suppressClick = false

    function begin(x: number, y: number) {
      const state = stateRef.current
      mode = "none"
      if (!state.enabled || state.refreshing || Date.now() < cooldownUntil.current) return
      if (scrollTop() > 0) return
      mode = "pending"
      startX = x
      startY = y
    }

    function drag(x: number, y: number, prevent: () => void) {
      if (mode === "none" || mode === "ignore") return
      const dx = x - startX
      const dy = y - startY

      if (mode === "pending") {
        if (Math.abs(dx) < START_SLOP && Math.abs(dy) < START_SLOP) return
        // Mostly sideways, or upward, or the page moved: not a pull.
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || scrollTop() > 0) {
          mode = "ignore"
          return
        }
        mode = "pull"
      }

      // Pulling: keep the page itself (and any text selection) from moving.
      prevent()
      offset.set(Math.min(MAX_PULL, Math.max(0, (dy - START_SLOP) * RESISTANCE)))
    }

    function finish() {
      const wasPulling = mode === "pull"
      mode = "none"
      if (!wasPulling) return
      if (offset.get() >= THRESHOLD) {
        startedAt.current = Date.now()
        setRefreshing(true)
        animate(offset, THRESHOLD, { duration: 0.15, ease: "easeOut" })
        startTransition(() => router.refresh())
      } else {
        animate(offset, 0, { duration: 0.2, ease: "easeOut" })
      }
    }

    // Touch (phones and tablets).
    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        mode = "none"
        return
      }
      begin(event.touches[0]!.clientX, event.touches[0]!.clientY)
    }
    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0]
      if (!touch || event.touches.length !== 1) {
        mode = "ignore"
        return
      }
      drag(touch.clientX, touch.clientY, () => {
        if (event.cancelable) event.preventDefault()
      })
    }

    // Mouse (desktop): the same gesture with a held button. Not started on form fields.
    function onMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (event.button !== 0 || target?.closest("input, textarea, select, [contenteditable]")) return
      begin(event.clientX, event.clientY)
    }
    function onMouseMove(event: MouseEvent) {
      drag(event.clientX, event.clientY, () => {
        event.preventDefault()
        window.getSelection()?.removeAllRanges()
        suppressClick = true
      })
    }
    // Starting on a picture or link would begin the browser's own drag-and-drop and cancel ours.
    function onDragStart(event: DragEvent) {
      if (mode === "pending" || mode === "pull") event.preventDefault()
    }
    function onMouseUp() {
      finish()
    }
    // A drag that ended on a link or button must not also click it.
    function onClickCapture(event: MouseEvent) {
      if (!suppressClick) return
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    root.addEventListener("touchstart", onTouchStart, { passive: true })
    root.addEventListener("touchmove", onTouchMove, { passive: false })
    root.addEventListener("touchend", finish)
    root.addEventListener("touchcancel", finish)
    root.addEventListener("mousedown", onMouseDown)
    root.addEventListener("dragstart", onDragStart)
    root.addEventListener("click", onClickCapture, true)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      root.removeEventListener("touchstart", onTouchStart)
      root.removeEventListener("touchmove", onTouchMove)
      root.removeEventListener("touchend", finish)
      root.removeEventListener("touchcancel", finish)
      root.removeEventListener("mousedown", onMouseDown)
      root.removeEventListener("dragstart", onDragStart)
      root.removeEventListener("click", onClickCapture, true)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      html.style.overscrollBehaviorY = previous
    }
  }, [offset, router, startTransition])

  // Done: the server answered. Keep the logo up for a minimum time, then slide back.
  React.useEffect(() => {
    if (!refreshing) return
    const finish = () => {
      animate(offset, 0, { duration: 0.2, ease: "easeOut" })
      cooldownUntil.current = Date.now() + COOLDOWN_MS
      setRefreshing(false)
    }
    if (pending) {
      const giveUp = setTimeout(finish, GIVE_UP_MS)
      return () => clearTimeout(giveUp)
    }
    const wait = Math.max(0, MIN_REFRESH_MS - (Date.now() - startedAt.current))
    const timer = setTimeout(finish, wait)
    return () => clearTimeout(timer)
  }, [refreshing, pending, offset])

  return (
    <div ref={rootRef} className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{ height: THRESHOLD }}
      >
        <LogoFold progress={progress} refreshing={refreshing} />
      </div>
      <motion.div style={{ y: offset }} className="relative flex flex-1 flex-col">
        {children}
      </motion.div>
      <span role="status" className="sr-only">
        {refreshing ? "Refreshing" : ""}
      </span>
    </div>
  )
}

export { PullToRefresh }
