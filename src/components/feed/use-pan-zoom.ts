"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"

/**
 * Pinch, wheel, double-tap and drag zoom for one picture, with no library.
 *
 * The stage element (the `ref`) fills the screen and the picture is drawn
 * "contain" inside it, so the size it really shows at 1x is worked out from
 * the stored width and height. The picture is moved with a CSS transform
 * (translate then scale, from the stage centre). Panning is clamped so the
 * picture can never leave the screen; at 1x it cannot move at all.
 *
 *   two fingers      pinch, around the midpoint (and pan with it)
 *   wheel / trackpad zoom around the pointer
 *   double tap/click toggles 1x <-> 2.5x at that point
 *   drag             pan while zoomed; at 1x a quick horizontal swipe calls onSwipe
 *   keys             + - 0 zoom, arrows pan while zoomed, left/right call onSwipe at 1x
 */
export const MIN_SCALE = 1
export const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2.5
const KEY_ZOOM_STEP = 1.5
const KEY_PAN_STEP = 48
const TAP_MAX_MS = 250
const TAP_MAX_MOVE = 10
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_DISTANCE = 40
const SWIPE_MIN_DISTANCE = 60
const SWIPE_DOMINANCE = 1.5
const WHEEL_ZOOM_SPEED = 0.002
const PINCH_WHEEL_ZOOM_SPEED = 0.01

interface Point {
  x: number
  y: number
}
interface Size {
  width: number
  height: number
}
interface Transform {
  scale: number
  x: number
  y: number
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** How big the "contain" picture really is inside the stage at 1x. */
function fittedSize(box: Size, image: Size): Size {
  const fit = Math.min(box.width / image.width, box.height / image.height)
  return { width: image.width * fit, height: image.height * fit }
}

function clampTransform(t: Transform, box: Size, image: Size): Transform {
  const scale = clamp(t.scale, MIN_SCALE, MAX_SCALE)
  const fitted = fittedSize(box, image)
  const maxX = Math.max(0, (fitted.width * scale - box.width) / 2)
  const maxY = Math.max(0, (fitted.height * scale - box.height) / 2)
  return { scale, x: clamp(t.x, -maxX, maxX), y: clamp(t.y, -maxY, maxY) }
}

/** Change the scale while the picture point under `anchor` (from the stage centre) stays put. */
function zoomAt(t: Transform, nextScale: number, anchor: Point): Transform {
  const qx = (anchor.x - t.x) / t.scale
  const qy = (anchor.y - t.y) / t.scale
  return { scale: nextScale, x: anchor.x - qx * nextScale, y: anchor.y - qy * nextScale }
}

type Gesture =
  | { kind: "drag"; start: Point; startTransform: Transform; time: number; moved: boolean }
  | { kind: "pinch"; distance: number; mid: Point; startTransform: Transform }

interface Options {
  /** Stored size of the picture, used for the pan limits. */
  image: Size
  /** Called for a horizontal swipe or an arrow key at 1x: 1 = next, -1 = previous. */
  onSwipe?: (direction: 1 | -1) => void
}

function usePanZoom({ image, onSwipe }: Options) {
  const reduceMotion = useReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)
  const [transform, setTransform] = React.useState<Transform>(IDENTITY)
  const [smooth, setSmooth] = React.useState(false)
  const current = React.useRef<Transform>(IDENTITY)
  const pointers = React.useRef(new Map<number, Point>())
  const gesture = React.useRef<Gesture | null>(null)
  const lastTap = React.useRef<{ time: number; point: Point } | null>(null)
  const imageRef = React.useRef(image)
  const onSwipeRef = React.useRef(onSwipe)
  React.useEffect(() => {
    imageRef.current = image
    onSwipeRef.current = onSwipe
  })

  const box = React.useCallback((): { size: Size; center: Point } | null => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    return { size: { width: rect.width, height: rect.height }, center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }
  }, [])

  const commit = React.useCallback(
    (next: Transform, animated: boolean) => {
      const b = box()
      const clamped = b ? clampTransform(next, b.size, imageRef.current) : IDENTITY
      current.current = clamped
      setSmooth(animated && !reduceMotion)
      setTransform(clamped)
    },
    [box, reduceMotion]
  )

  const relative = React.useCallback(
    (clientX: number, clientY: number): Point => {
      const b = box()
      return b ? { x: clientX - b.center.x, y: clientY - b.center.y } : { x: 0, y: 0 }
    },
    [box]
  )

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point]
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: relative((a.x + b.x) / 2, (a.y + b.y) / 2),
        startTransform: current.current,
      }
    } else if (pointers.current.size === 1) {
      gesture.current = {
        kind: "drag",
        start: { x: event.clientX, y: event.clientY },
        startTransform: current.current,
        time: event.timeStamp,
        moved: false,
      }
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const active = gesture.current
    if (!active) return

    if (active.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [Point, Point]
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mid = relative((a.x + b.x) / 2, (a.y + b.y) / 2)
      const scale = clamp(active.startTransform.scale * (distance / active.distance), MIN_SCALE, MAX_SCALE)
      // The picture point that was under the starting midpoint follows the current midpoint.
      const qx = (active.mid.x - active.startTransform.x) / active.startTransform.scale
      const qy = (active.mid.y - active.startTransform.y) / active.startTransform.scale
      commit({ scale, x: mid.x - qx * scale, y: mid.y - qy * scale }, false)
    } else if (active.kind === "drag") {
      const dx = event.clientX - active.start.x
      const dy = event.clientY - active.start.y
      if (Math.hypot(dx, dy) > TAP_MAX_MOVE) active.moved = true
      if (current.current.scale > 1) {
        commit({ scale: current.current.scale, x: active.startTransform.x + dx, y: active.startTransform.y + dy }, false)
      }
    }
  }

  function finish(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const active = gesture.current
    pointers.current.delete(event.pointerId)

    if (active?.kind === "pinch") {
      // One finger may stay down: carry on as a drag from where it is.
      const rest = [...pointers.current.values()][0]
      gesture.current = rest
        ? { kind: "drag", start: rest, startTransform: current.current, time: event.timeStamp, moved: true }
        : null
      return
    }
    if (active?.kind !== "drag" || pointers.current.size > 0) return
    gesture.current = null
    if (cancelled) return

    const dx = event.clientX - active.start.x
    const dy = event.clientY - active.start.y

    if (!active.moved && event.timeStamp - active.time < TAP_MAX_MS) {
      const point = { x: event.clientX, y: event.clientY }
      const previous = lastTap.current
      if (previous && event.timeStamp - previous.time < DOUBLE_TAP_MS && Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < DOUBLE_TAP_DISTANCE) {
        lastTap.current = null
        if (current.current.scale > 1.01) commit(IDENTITY, true)
        else commit(zoomAt(current.current, DOUBLE_TAP_SCALE, relative(point.x, point.y)), true)
      } else {
        lastTap.current = { time: event.timeStamp, point }
      }
      return
    }

    if (current.current.scale === 1 && Math.abs(dx) > SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE) {
      onSwipeRef.current?.(dx < 0 ? 1 : -1)
    }
  }

  // Wheel needs a non-passive listener to stop the page from zooming or scrolling.
  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const speed = event.ctrlKey ? PINCH_WHEEL_ZOOM_SPEED : WHEEL_ZOOM_SPEED
      const nextScale = clamp(current.current.scale * Math.exp(-delta * speed), MIN_SCALE, MAX_SCALE)
      commit(zoomAt(current.current, nextScale, relative(event.clientX, event.clientY)), false)
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [commit, relative])

  // The viewer is modal, so listening on the document is safe. Menus and dialogs opened from it handle their own keys.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('[role="menu"], [role="alertdialog"], input, textarea, [contenteditable="true"]')) return
      const scale = current.current.scale
      const centre: Point = { x: 0, y: 0 }

      if (event.key === "+" || event.key === "=") commit(zoomAt(current.current, scale * KEY_ZOOM_STEP, centre), true)
      else if (event.key === "-" || event.key === "_") commit(zoomAt(current.current, scale / KEY_ZOOM_STEP, centre), true)
      else if (event.key === "0") commit(IDENTITY, true)
      else if (scale > 1 && event.key.startsWith("Arrow")) {
        const step = { ArrowLeft: [KEY_PAN_STEP, 0], ArrowRight: [-KEY_PAN_STEP, 0], ArrowUp: [0, KEY_PAN_STEP], ArrowDown: [0, -KEY_PAN_STEP] }[event.key]
        if (!step) return
        commit({ scale, x: current.current.x + step[0], y: current.current.y + step[1] }, true)
      } else if (scale === 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        onSwipeRef.current?.(event.key === "ArrowRight" ? 1 : -1)
      } else return
      event.preventDefault()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [commit])

  const style: React.CSSProperties = {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
    transition: smooth ? "transform 200ms ease-out" : "none",
    willChange: "transform",
  }

  return {
    ref,
    style,
    scale: transform.scale,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => finish(event, false),
      onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => finish(event, true),
    },
  }
}

export { usePanZoom }
