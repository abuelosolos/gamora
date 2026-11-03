"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PostButton } from "@/components/layout/post-button"
import { useUnreadCount } from "@/components/layout/use-unread-count"

/**
 * Which floating pieces each screen shows. From the Figma frames:
 *   Home                      nav + post button above the nav
 *   Search, Jobs wall, Activity   nav only
 *   Profile                   post button near the bottom (no nav)
 *   Create, post, settings, report, anything else   nothing
 * Add a row here when a later phase adds a screen.
 */
type Chrome = { nav: boolean; postButton: "above-nav" | "low" | null }

const NONE: Chrome = { nav: false, postButton: null }

const RULES: { prefix: string; chrome: Chrome }[] = [
  { prefix: "/feed", chrome: { nav: true, postButton: "above-nav" } },
  { prefix: "/search", chrome: { nav: true, postButton: null } },
  // The job page and its apply sheet have no nav in Figma (Jobs(Post)); only the wall does.
  { prefix: "/jobs/", chrome: NONE },
  { prefix: "/jobs", chrome: { nav: true, postButton: null } },
  { prefix: "/activity", chrome: { nav: true, postButton: null } },
  { prefix: "/u/", chrome: { nav: false, postButton: "low" } },
]

function chromeFor(pathname: string): Chrome {
  const rule = RULES.find(({ prefix }) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  return rule?.chrome ?? NONE
}

/**
 * Bottom of the phone frame. The wrapper sticks to the bottom of the frame and
 * ignores pointer events, so only the nav and the button are clickable.
 */
function AppChrome() {
  const pathname = usePathname()
  const { nav, postButton } = chromeFor(pathname)
  // Looking at Activity counts as seeing it: no badge there, and no polling.
  const unread = useUnreadCount({ paused: !nav || pathname.startsWith("/activity") })
  if (!nav && !postButton) return null

  return (
    <div className={`pointer-events-none sticky z-10 mt-auto flex flex-col items-end ${nav ? "bottom-0" : "bottom-4"}`}>
      {postButton ? (
        <PostButton className={`pointer-events-auto mr-5.5 ${postButton === "above-nav" ? "mb-3.75" : "mb-12"}`} />
      ) : null}
      {nav ? (
        <div className="pointer-events-auto relative w-full pb-4">
          {/* Fill in the page colour behind the lower half of the nav and the gap under it, so nothing shows past the rounded corners. Adds no size. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 bg-bgDefault" />
          <BottomNav className="relative w-full" activityBadge={unread} />
        </div>
      ) : null}
    </div>
  )
}

export { AppChrome }
