"use client"

import * as React from "react"
import { ArrowUp } from "@/components/icons"
import { Avatar } from "@/components/ui/avatar"
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll"
import { cn } from "@/lib/utils"
import type { NewerFeedPosts } from "@/server/services/posts"

export interface NewPostsPillProps {
  found: NewerFeedPosts
  onPress: () => void
}

/**
 * "New posts" pill: the newest poster's avatar and an up arrow, hanging at the
 * top of the feed. It slides in from above, tucks away while the reader scrolls
 * down and slides back on the way up, with the same motion as the top bar.
 */
function NewPostsPill({ found, onPress }: NewPostsPillProps) {
  const scrolledAway = useHideOnScroll()
  const [entered, setEntered] = React.useState(false)
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const hidden = scrolledAway || !entered
  const name = found.author?.name ?? "someone"
  const label = found.count === 1 ? `Show new post from ${name}` : `Show ${found.count} new posts, latest from ${name}`

  return (
    <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-center">
      <button
        type="button"
        onClick={onPress}
        aria-label={label}
        tabIndex={hidden ? -1 : 0}
        className={cn(
          "pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-accentDefault pr-3.5 pl-2 text-textOnAccent shadow-lg outline-none transition-transform duration-200 ease-out hover:bg-accentPressed focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault motion-reduce:transition-none",
          hidden && "-translate-y-[200%]"
        )}
      >
        <Avatar size="xs" src={found.author?.avatarUrl} name={name} />
        <ArrowUp aria-hidden="true" className="size-6" />
      </button>
    </div>
  )
}

export { NewPostsPill }
