"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"

export interface FlagState {
  on: boolean
  count: number
}

export type FlagOutcome =
  | { ok: true; on: boolean; count: number }
  | { ok: false; error: string; message: string }

/**
 * Optimistic on/off state for a like, bookmark or repost.
 *
 * Pressing flips the button and the count at once, then asks the server for
 * the state it now wants. When the server answers, its numbers (counted in the
 * database) replace the guess. If the request fails, the button goes back to
 * how it was and a toast says why. While a request is open the button ignores
 * further presses, so a double tap cannot send two requests.
 */
export function useOptimisticFlag(initial: FlagState, request: (on: boolean) => Promise<FlagOutcome>) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [state, setState] = React.useState<FlagState>(initial)
  const [pending, setPending] = React.useState(false)
  const busy = React.useRef(false)

  // A refresh (pull down) can bring new numbers from the server: take them, unless a press is in flight.
  const [seen, setSeen] = React.useState(initial)
  if (seen.on !== initial.on || seen.count !== initial.count) {
    setSeen(initial)
    if (!pending) setState(initial)
  }

  const toggle = React.useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setPending(true)

    const previous = state
    const wanted = !previous.on
    setState({ on: wanted, count: Math.max(0, previous.count + (wanted ? 1 : -1)) })

    try {
      const result = await request(wanted)
      if (result.ok) {
        setState({ on: result.on, count: result.count })
      } else {
        setState(previous)
        if (result.error === "unauthorized") {
          router.push(`/sign-in?next=${encodeURIComponent(pathname)}`)
        } else {
          toast({ variant: "error", title: result.message })
        }
      }
    } catch {
      setState(previous)
      toast({ variant: "error", title: "Something went wrong. Try again." })
    } finally {
      busy.current = false
      setPending(false)
    }
  }, [state, request, router, pathname, toast])

  return { ...state, pending, toggle }
}
