"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { setFollowAction } from "@/server/actions/interactions"

/**
 * Optimistic follow/unfollow for one author. The label flips at once and goes
 * back if the server refuses. Signed-out viewers are sent to sign in. While a
 * request is open, further presses are ignored.
 */
export function useFollow(username: string, initial: boolean) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [following, setFollowing] = React.useState(initial)
  const busy = React.useRef(false)

  const toggle = React.useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const previous = following
    setFollowing(!previous)
    try {
      const result = await setFollowAction({ username, on: !previous })
      if (result.ok) {
        setFollowing(result.on)
        // On the Following tab the list itself changes with who you follow.
        if (pathname === "/feed" && searchParams.get("tab") === "following") router.refresh()
        toast({ variant: "success", title: result.on ? `Following @${username}` : `Unfollowed @${username}` })
      } else {
        setFollowing(previous)
        if (result.error === "unauthorized") router.push(`/sign-in?next=${encodeURIComponent(pathname)}`)
        else toast({ variant: "error", title: result.message })
      }
    } catch {
      setFollowing(previous)
      toast({ variant: "error", title: "Something went wrong. Try again." })
    } finally {
      busy.current = false
    }
  }, [following, username, router, pathname, searchParams, toast])

  return { following, toggle }
}
