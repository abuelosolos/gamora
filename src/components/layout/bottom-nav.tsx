"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BellFill, House, HouseFill, ReadCvLogo, ReadCvLogoFill, User, UserFill } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Figma: Navbar (Default and Variant2). A floating pill with four items:
 * Home, Jobs, Activity, Profile. The screens use the icon-only variant, so
 * that is the default here; `showLabels` renders the Default variant with a
 * 12px caption under each icon. The pill sits in a bgSurface tray. The active
 * item uses the filled icon in accentDefault.
 *
 * The create button is NOT part of this bar (see PostButton).
 *
 * Deviation from Figma: inactive items use textSecondary, not textDisabled,
 * because textDisabled is below 4.5:1 on several themes.
 */
export interface BottomNavProps extends React.ComponentProps<"nav"> {
  /** Overrides the active route. Defaults to the current pathname. Used by previews. */
  activeHref?: string
  /** Show the text label under each icon (Figma Default variant). */
  showLabels?: boolean
}

const ITEMS = [
  { href: "/feed", label: "Home", icon: House, activeIcon: HouseFill },
  { href: "/jobs", label: "Jobs", icon: ReadCvLogo, activeIcon: ReadCvLogoFill },
  { href: "/activity", label: "Activity", icon: Bell, activeIcon: BellFill },
  // /me redirects to the signed-in user's own profile.
  { href: "/me", label: "Profile", icon: User, activeIcon: UserFill },
] as const

/** Profile pages live at /u/<username>, which is also the Profile tab's home. */
function isActive(current: string, href: string): boolean {
  if (href === "/me") return current === "/me" || current.startsWith("/u/")
  return current === href || current.startsWith(`${href}/`)
}

function BottomNav({ activeHref, showLabels = false, className, ...props }: BottomNavProps) {
  const pathname = usePathname()
  const current = activeHref ?? pathname

  return (
    <nav
      aria-label="Main"
      data-slot="bottom-nav"
      className={cn("mx-px rounded-full bg-bgSurface p-2.5", className)}
      {...props}
    >
      <ul
        className={cn(
          "flex items-center justify-between rounded-full bg-bgDefault px-10 shadow-lg",
          showLabels ? "h-18" : "h-17.5"
        )}
      >
        {ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const active = isActive(current, href)
          const Glyph = active ? ActiveIcon : Icon
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={showLabels ? undefined : label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5 rounded-ui-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accentDefault",
                  active ? "text-accentDefault" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                <Glyph aria-hidden="true" className="size-7.5" />
                {showLabels ? <span className="text-caption">{label}</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { BottomNav }
