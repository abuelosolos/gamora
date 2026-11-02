import Link from "next/link"
import { chipVariants } from "@/components/ui/chip"
import { cn } from "@/lib/utils"
import type { ActivityFilter } from "@/server/validators/interactions"

/**
 * Figma: Activity filter row (Pills: All, Likes, Mentions, Replies). Each pill
 * is a link, so the filter lives in the URL (?filter=likes) and survives a reload.
 *
 * Deviation: "Mentions" is shown but disabled. Nobody can mention anyone yet,
 * so it would always be empty. "Replies" lists replies to your posts.
 */
const FILTERS: { value: ActivityFilter; label: string; href: string }[] = [
  { value: "all", label: "All", href: "/activity" },
  { value: "likes", label: "Likes", href: "/activity?filter=likes" },
  { value: "replies", label: "Replies", href: "/activity?filter=replies" },
]

function ActivityFilters({ active }: { active: ActivityFilter }) {
  return (
    <nav aria-label="Activity filter" className="border-b border-borderDefault bg-bgDefault px-5 py-2.5">
      <ul className="flex flex-wrap items-center gap-3.5">
        {FILTERS.slice(0, 2).map((filter) => (
          <li key={filter.value}>
            <FilterLink filter={filter} active={active} />
          </li>
        ))}
        <li>
          <span
            aria-disabled="true"
            className={cn(chipVariants({ variant: "outline" }), "pointer-events-none text-textDisabled")}
          >
            Mentions<span className="sr-only">, coming soon</span>
          </span>
        </li>
        <li>
          <FilterLink filter={FILTERS[2]!} active={active} />
        </li>
      </ul>
    </nav>
  )
}

function FilterLink({ filter, active }: { filter: (typeof FILTERS)[number]; active: ActivityFilter }) {
  const selected = filter.value === active
  return (
    <Link
      href={filter.href}
      aria-current={selected ? "page" : undefined}
      className={chipVariants({ variant: selected ? "selected" : "outline" })}
    >
      {filter.label}
    </Link>
  )
}

export { ActivityFilters }
