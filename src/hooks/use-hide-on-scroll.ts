"use client"

import * as React from "react"

/**
 * True while something should be tucked away: it hides on the way down and
 * comes back on the way up. `height` is how far the page must be scrolled
 * before hiding can start (the bar's own height), and `threshold` is how many
 * pixels of movement count as a change of direction, so a tiny jiggle does not
 * flicker the bar.
 *
 * Scroll events do not bubble, but a capture listener on the document hears
 * every scroller: the window on phones, and the phone frame (which scrolls
 * itself from the md breakpoint up). Nested scrollers (carousels, the sheet)
 * are ignored: only a vertical scroller that is the page or the phone frame counts.
 */
export function useHideOnScroll({ enabled = true, height = 50, threshold = 8 } = {}) {
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) return

    let last = 0
    let source: EventTarget | null = null
    let frame = 0
    let pending: Element | null = null

    function read(target: EventTarget | null): { el: Element; top: number } | null {
      if (target === document || target === document.documentElement || target === document.body) {
        const el = document.scrollingElement ?? document.documentElement
        return { el, top: el.scrollTop }
      }
      if (target instanceof Element && target.closest('[data-slot="phone-frame"]') === target) {
        return { el: target, top: target.scrollTop }
      }
      return null
    }

    function update() {
      frame = 0
      const current = read(pending)
      pending = null
      if (!current) return
      const { el, top } = current
      if (source !== el) {
        // A different scroller took over: start measuring from its position.
        source = el
        last = top
        return
      }
      const delta = top - last
      if (top <= 0) {
        setHidden(false)
        last = top
      } else if (delta > threshold && top > height) {
        setHidden(true)
        last = top
      } else if (delta < -threshold) {
        setHidden(false)
        last = top
      } else if (Math.abs(delta) > threshold) {
        last = top
      }
    }

    function onScroll(event: Event) {
      if (!read(event.target)) return
      pending = event.target instanceof Element ? event.target : document.documentElement
      if (event.target === document) pending = document.documentElement
      if (!frame) frame = requestAnimationFrame(update)
    }

    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, height, threshold])

  return enabled && hidden
}
