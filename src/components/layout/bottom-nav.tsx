"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BellFill, House, HouseFill, Plus, ReadCvLogo, ReadCvLogoFill } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Figma: Navbar (a floating pill with a drop shadow; active item uses the
 * filled icon in accentDefault). Items here: Home, Jobs, Post (centre),
 * Activity and Shop (not available yet, links to the Coming soon screen).
 *
 * Deviation from Figma: inactive items use textSecondary, not textDisabled,
 * because textDisabled is below 4.5:1 on several themes.
 */
export interface BottomNavProps extends React.ComponentProps<"nav"> {
  /** Overrides the active route. Defaults to the current pathname. Used by previews. */
  activeHref?: string
}

const ROUTES = {
  home: "/feed",
  jobs: "/jobs",
  post: "/create",
  activity: "/activity",
  shop: "/unavailable/shop",
} as const

function isActive(current: string, href: string): boolean {
  return current === href || current.startsWith(`${href}/`)
}

const itemClass =
  "relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-ui-md px-1 py-1.5 text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accentDefault"

function BottomNav({ activeHref, className, ...props }: BottomNavProps) {
  const pathname = usePathname()
  const current = activeHref ?? pathname

  const tab = (href: string, label: string, Icon: React.ElementType, IconActive: React.ElementType) => {
    const active = isActive(current, href)
    const Glyph = active ? IconActive : Icon
    return (
      <li>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(itemClass, active ? "text-accentDefault" : "text-textSecondary hover:text-textPrimary")}
        >
          <Glyph aria-hidden="true" className="size-7.5" />
          <span>{label}</span>
        </Link>
      </li>
    )
  }

  const shopActive = isActive(current, ROUTES.shop)
  const postActive = isActive(current, ROUTES.post)

  return (
    <nav
      aria-label="Main"
      data-slot="bottom-nav"
      className={cn(
        "sticky bottom-4 z-10 mx-4 mt-auto rounded-full border border-borderDefault bg-bgDefault px-3 py-2 shadow-lg",
        className
      )}
      {...props}
    >
      <ul className="grid grid-cols-5 items-center">
        {tab(ROUTES.home, "Home", House, HouseFill)}
        {tab(ROUTES.jobs, "Jobs", ReadCvLogo, ReadCvLogoFill)}
        <li className="flex justify-center">
          <Link
            href={ROUTES.post}
            aria-label="Create post"
            aria-current={postActive ? "page" : undefined}
            className="flex size-12.5 items-center justify-center rounded-full bg-accentDefault text-textOnAccent outline-none transition-colors hover:bg-accentPressed focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault"
          >
            <Plus aria-hidden="true" className="size-7.5" />
          </Link>
        </li>
        {tab(ROUTES.activity, "Activity", Bell, BellFill)}
        <li>
          <Link
            href={ROUTES.shop}
            aria-current={shopActive ? "page" : undefined}
            className={cn(itemClass, shopActive ? "text-accentDefault" : "text-textSecondary hover:text-textPrimary")}
          >
            {/* TODO(missing icon): shop (storefront / shopping bag). Not in src/assets/svgs yet. */}
            <span aria-hidden="true" className="size-7.5" />
            <span>Shop</span>
            <span className="sr-only">, coming soon</span>
            <Badge variant="neutral" aria-hidden="true" className="absolute -top-2 right-0 px-1.5">
              Soon
            </Badge>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export { BottomNav }
