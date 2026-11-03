"use client"

import * as React from "react"
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react"
import { LOGO_SHAPES, LOGO_VIEWBOX } from "@/components/shared/logo-paths"
import { cn } from "@/lib/utils"

/**
 * The origami logo for pull-to-refresh. Each wing folds on its own vertical
 * hinge (scaleX toward the hinge), so the bird looks folded flat and opens like
 * paper.
 *
 *   dragging:   `progress` (0 to 1, a motion value so nothing re-renders while
 *               the finger moves) sets how far the bird is unfolded, how large
 *               it is and how visible.
 *   refreshing: the wings fold and unfold in a loop, the two sides a little
 *               apart in time, until `refreshing` turns off.
 *
 * Colours are the logo tokens (they follow the accent). With reduced motion
 * the bird does not fold: it stays open and only fades with progress.
 * Decorative: the parent announces the state.
 */
export interface LogoFoldProps {
  progress: MotionValue<number>
  refreshing: boolean
  className?: string
}

const FOLDED = 0.12
const LOOP_SECONDS = 1.2

function LogoFold({ progress, refreshing, className }: LogoFoldProps) {
  const reduce = useReducedMotion()
  const right = useMotionValue(FOLDED)
  const left = useMotionValue(FOLDED)
  const scale = useTransform(progress, [0, 1], [0.5, 1])
  const opacity = useTransform(progress, [0, 0.25, 1], [0, 0.6, 1])

  // Dragging: the fold follows the pull.
  React.useEffect(() => {
    if (refreshing) return
    const follow = (value: number) => {
      const open = reduce ? 1 : FOLDED + (1 - FOLDED) * Math.min(1, Math.max(0, value))
      right.set(open)
      left.set(open)
    }
    follow(progress.get())
    return progress.on("change", follow)
  }, [refreshing, progress, reduce, right, left])

  // Refreshing: fold and unfold until it stops.
  React.useEffect(() => {
    if (!refreshing || reduce) return
    const keyframes = [1, FOLDED, 1]
    const options = { duration: LOOP_SECONDS, ease: "easeInOut" as const, repeat: Infinity }
    const a = animate(right, keyframes, options)
    const b = animate(left, keyframes, { ...options, delay: LOOP_SECONDS / 4 })
    return () => {
      a.stop()
      b.stop()
    }
  }, [refreshing, reduce, right, left])

  return (
    <motion.svg
      data-slot="logo-fold"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_VIEWBOX}
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
      style={{ scale: refreshing ? 1 : scale, opacity: refreshing ? 1 : opacity }}
    >
      {LOGO_SHAPES.map((shape) => (
        <motion.path
          key={shape.id}
          className={shape.tone === "logoPrimary" ? "fill-logoPrimary" : "fill-logoSecondary"}
          d={shape.d}
          style={{
            scaleX: shape.hingeX > 50 ? right : left,
            transformBox: "view-box",
            transformOrigin: `${shape.hingeX}px 56px`,
          }}
        />
      ))}
    </motion.svg>
  )
}

export { LogoFold }
