"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll"
import { cn } from "@/lib/utils"

/**
 * Figma: Top Navbar (Home, Activity, Jobs, Profile, Post, Settings). One bar
 * with three slots, so every variant is a composition:
 *   Home:     leading = logo,        trailing = search, chat, avatar
 *   Activity: title   = "Activity",  trailing = search, chat, avatar
 *   Profile:  leading = back button, trailing = search, more
 *   Post:     leading = close,       trailing = Drafts, Posts chips
 *   Jobs:     title   = "Jobs",      trailing = search, filters
 *
 * The bar slides up out of view while the page is scrolled down and slides back
 * when it is scrolled up (useHideOnScroll). It stays visible at the top of the
 * page, while focus is inside it, and always when `hideOnScroll` is false
 * (screens whose bar holds the main action, like Post and Save).
 */
export interface TopBarProps extends Omit<React.ComponentProps<"header">, "title"> {
  title?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  /** Slide away while scrolling down. Default true. */
  hideOnScroll?: boolean
  /** A row that belongs to the bar (Home's For you / Following slip): it hides and returns with the bar. */
  below?: React.ReactNode
  /** A borderDefault line under the whole bar (and its `below` row). */
  bordered?: boolean
}

function TopBar({
  title,
  leading,
  trailing,
  hideOnScroll = true,
  below,
  bordered = false,
  className,
  onFocus,
  onBlur,
  ...props
}: TopBarProps) {
  const scrolledAway = useHideOnScroll({ enabled: hideOnScroll })
  const [focusInside, setFocusInside] = React.useState(false)
  const hidden = scrolledAway && !focusInside

  return (
    <header
      data-slot="top-bar"
      data-hidden={hidden || undefined}
      onFocus={(event) => {
        setFocusInside(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocusInside(false)
        onBlur?.(event)
      }}
      className={cn(
        "sticky top-0 z-10 bg-bgDefault transition-transform duration-200 ease-out motion-reduce:transition-none",
        bordered && "border-b border-borderDefault",
        hidden && "-translate-y-full",
        className
      )}
      {...props}
    >
      <div className="flex min-h-12.5 items-center justify-between gap-3 px-5 py-1">
        <div className="flex min-w-0 items-center gap-2.5">
          {leading}
          {title ? (
            <h1 className="truncate font-display text-title-s font-semibold text-textPrimary">
              {title}
            </h1>
          ) : null}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>
      {below}
    </header>
  )
}

/** Icon button for the bar. 44px touch target; `label` is required because it has no text. */
function TopBarButton({
  label,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "aria-label" | "variant" | "size"> & {
  label: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className="[&_svg:not([class*='size-'])]:size-7.5"
      {...props}
    >
      {children}
    </Button>
  )
}

export { TopBar, TopBarButton }
