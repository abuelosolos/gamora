"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FypFilterSheet } from "@/components/feed/fyp-filter-sheet"
import { CaretDown, SlidersHorizontal } from "@/components/icons"
import { cn } from "@/lib/utils"
import type { FeedTab } from "@/server/validators/posts"

/**
 * Figma: SlipSelect (For you / Following). Caption 12/16, the active tab is
 * textPrimary with an underline, the other is muted. It sits inside the top
 * navbar (TopBar `below`), so it hides and returns with the bar.
 *
 * The active "For you" has a CaretDown and opens the genre sheet; while a
 * genre filter is on, the caret becomes SlidersHorizontal (Figma "FYP Filtered").
 * The chosen genres live in the URL (?genres=Pixel art,Abstract), like the tab.
 *
 * Deviations: the inactive tab uses textSecondary (textDisabled is under 4.5:1
 * on several themes), and the active tab keeps its underline when filtered.
 */
export interface FeedTabsProps {
  active: FeedTab
  /** The genres currently filtering For you. */
  genres?: string[]
}

const tabClass = (isActive: boolean) =>
  cn(
    "flex min-h-11 items-center gap-1 border-b-2 text-caption outline-none focus-visible:ring-2 focus-visible:ring-accentDefault",
    isActive ? "border-textPrimary text-textPrimary" : "border-transparent text-textSecondary hover:text-textPrimary"
  )

function FeedTabs({ active, genres = [] }: FeedTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [, startTransition] = React.useTransition()
  // What the toggles show right now; the URL (and the feed) catch up behind it.
  const [selected, setSelected] = React.useState(genres)
  const filtered = genres.length > 0
  const Marker = filtered ? SlidersHorizontal : CaretDown

  function applyGenres(next: string[]) {
    setSelected(next)
    const query = next.length > 0 ? `?genres=${encodeURIComponent(next.join(","))}` : ""
    startTransition(() => router.replace(`${pathname}${query}`, { scroll: false }))
  }

  return (
    <nav aria-label="Feed" className="px-5">
      <ul className="flex gap-2.5">
        <li>
          {active === "for-you" ? (
            <button
              type="button"
              aria-current="page"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={filtered ? `For you, filtered by ${genres.length} genres. Choose genres` : "For you. Choose genres"}
              onClick={() => {
                setSelected(genres)
                setOpen(true)
              }}
              className={tabClass(true)}
            >
              For you
              <Marker aria-hidden="true" className="size-3.75" />
            </button>
          ) : (
            <Link href="/feed" className={tabClass(false)}>
              For you
            </Link>
          )}
        </li>
        <li>
          <Link
            href="/feed?tab=following"
            aria-current={active === "following" ? "page" : undefined}
            className={tabClass(active === "following")}
          >
            Following
          </Link>
        </li>
      </ul>
      {active === "for-you" ? (
        <FypFilterSheet open={open} onOpenChange={setOpen} selected={selected} onChange={applyGenres} />
      ) : null}
    </nav>
  )
}

export { FeedTabs }
