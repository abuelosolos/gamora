"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DotsThreeVertical, GearSix, Info, PaintBrush, SignOut } from "@/components/icons"
import { TopBarButton } from "@/components/layout/top-bar"
import { ReportSheet } from "@/components/report/report-sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"

/**
 * Figma: the Dropdown on the profile's three-dot button. Your own profile:
 * Settings and Appearance (real screens), Wallet (Coming soon) and Log-out (works).
 * Another artist's profile: Report (opens the report sheet). Signed out: the menu is not shown.
 *
 * Deviations: Wallet uses the Info icon, as the design does. Report has no icon
 * because the icon set has no Flag yet.
 */
export interface ProfileMenuProps {
  isOwner: boolean
  /** The profile being viewed. Names the report target. */
  username: string
}

const itemClass = "min-h-11 px-3 text-body-sm"

function ProfileMenu({ isOwner, username }: ProfileMenuProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [signingOut, setSigningOut] = React.useState(false)
  const [reporting, setReporting] = React.useState(false)

  async function logOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const { error } = await authClient.signOut()
      if (error) throw new Error("sign out failed")
      router.replace("/")
      router.refresh()
    } catch {
      setSigningOut(false)
      toast({ variant: "error", title: "Could not log out. Try again." })
    }
  }

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TopBarButton label="More options">
          <DotsThreeVertical aria-hidden="true" />
        </TopBarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-43">
        {isOwner ? (
          <>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/settings">
                <GearSix aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/settings/appearance">
                <PaintBrush aria-hidden="true" />
                Appearance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/unavailable/wallet">
                <Info aria-hidden="true" />
                Wallet
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemClass} disabled={signingOut} onSelect={() => void logOut()}>
              <SignOut aria-hidden="true" />
              {signingOut ? "Logging out…" : "Log-out"}
            </DropdownMenuItem>
          </>
        ) : (
          // TODO(icon): Flag is not in src/components/icons yet, so Report has no icon.
          <DropdownMenuItem className={itemClass} onSelect={() => setReporting(true)}>
            Report
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
      </DropdownMenu>
      {isOwner ? null : (
        <ReportSheet open={reporting} onOpenChange={setReporting} target={{ type: "profile", username }} noun="profile" />
      )}
    </>
  )
}

export { ProfileMenu }
