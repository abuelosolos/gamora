import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Figma: Top Navbar (Home, Activity, Jobs, Profile, Post, Settings). One bar
 * with three slots, so every variant is a composition:
 *   Home:     leading = logo,        trailing = search, chat, avatar
 *   Activity: title   = "Activity",  trailing = search, chat, avatar
 *   Profile:  leading = back button, trailing = search, more
 *   Post:     leading = close,       trailing = Drafts, Posts chips
 *   Jobs:     title   = "Jobs",      trailing = search, filters
 */
export interface TopBarProps extends Omit<React.ComponentProps<"header">, "title"> {
  title?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

function TopBar({ title, leading, trailing, className, ...props }: TopBarProps) {
  return (
    <header
      data-slot="top-bar"
      className={cn(
        "sticky top-0 z-10 flex min-h-12.5 items-center justify-between gap-3 bg-bgDefault px-5 py-1",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {leading}
        {title ? (
          <h1 className="truncate font-display text-title-s font-semibold text-textPrimary">
            {title}
          </h1>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
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
