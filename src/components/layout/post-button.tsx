import * as React from "react"
import Link from "next/link"
import { Plus } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Figma: PostButton. A 50px accent circle with a 30px plus, floating at the
 * right edge of the screen. It is not part of the bottom nav: on Home it sits
 * just above the nav, on Profile (no nav) near the bottom right. Placement is
 * decided by AppChrome.
 */
function PostButton({ className, ...props }: Omit<React.ComponentProps<typeof Link>, "href" | "children">) {
  return (
    <Link
      href="/create"
      aria-label="Create post"
      data-slot="post-button"
      className={cn(
        "flex size-12.5 items-center justify-center rounded-full bg-accentDefault text-textOnAccent shadow-lg outline-none transition-colors hover:bg-accentPressed focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault",
        className
      )}
      {...props}
    >
      <Plus aria-hidden="true" className="size-7.5" />
    </Link>
  )
}

export { PostButton }
