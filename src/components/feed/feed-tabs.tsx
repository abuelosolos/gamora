import Link from "next/link"
import { cn } from "@/lib/utils"
import type { FeedTab } from "@/server/validators/posts"

/**
 * Figma: SlipSelect (For you / Following). Caption 12/16, the active tab is
 * textPrimary with an underline, the other is muted.
 *
 * Deviations: the inactive tab uses textSecondary (textDisabled is under 4.5:1
 * on several themes), and the caret on "For you" is left out because the
 * filter dropdown is not part of this phase. Each tab is a link, so the state
 * lives in the URL (?tab=following) and survives a reload.
 */
const TABS: { value: FeedTab; label: string; href: string }[] = [
  { value: "for-you", label: "For you", href: "/feed" },
  { value: "following", label: "Following", href: "/feed?tab=following" },
]

function FeedTabs({ active }: { active: FeedTab }) {
  return (
    <nav aria-label="Feed" className="bg-bgDefault px-5">
      <ul className="flex gap-2.5">
        {TABS.map((tab) => {
          const isActive = tab.value === active
          return (
            <li key={tab.value}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-b-2 text-caption outline-none focus-visible:ring-2 focus-visible:ring-accentDefault",
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

export { FeedTabs }
