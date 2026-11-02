import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Loading placeholder. Pass size and shape through className, e.g.
 * <Skeleton className="h-4 w-32" /> or <Skeleton className="size-10 rounded-full" />.
 * The pulse only runs when the user has not asked for reduced motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded-ui-sm bg-borderDefault motion-safe:animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
