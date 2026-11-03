import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ProfileTab } from "@/server/validators/posts"

/**
 * Figma: ProfileSlipSelect (Activity, Posts, Likes, Reposts, Subscribed Posts), plus
 * a Replies tab that is not in the design.
 * Caption 12/16, 15px apart; the selected tab is textPrimary with a 2px
 * underline. Each tab is a link (?tab=posts), so the choice lives in the URL
 * and survives a reload. Activity is the default and has no query.
 *
 * Subscribed Posts opens the Coming soon screen (no subscriptions yet).
 *
 * Deviation: inactive tabs use textSecondary (textDisabled is under 4.5:1 on
 * several themes), same as the feed tabs. The strip scrolls sideways if the
 * labels ever outgrow the screen.
 */
const TABS: { value: ProfileTab; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "posts", label: "Posts" },
  { value: "replies", label: "Replies" },
  { value: "likes", label: "Likes" },
  { value: "reposts", label: "Reposts" },
  { value: "subscribed", label: "Subscribed Posts" },
]

function ProfileTabs({ username, active }: { username: string; active: ProfileTab }) {
  return (
    <nav aria-label="Profile sections" className="overflow-x-auto bg-bgDefault px-5 [scrollbar-width:none]">
      <ul className="flex gap-3.75">
        {TABS.map((tab) => {
          const isActive = tab.value === active
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                href={
                  tab.value === "subscribed"
                    ? "/unavailable/subscriptions"
                    : tab.value === "activity"
                      ? `/u/${username}`
                      : `/u/${username}?tab=${tab.value}`
                }
                replace={tab.value !== "subscribed"}
                scroll={tab.value === "subscribed" ? undefined : false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-b-2 text-caption whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accentDefault",
                  isActive
                    ? "border-textPrimary text-textPrimary"
                    : "border-transparent text-textSecondary hover:text-textPrimary"
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { ProfileTabs }
