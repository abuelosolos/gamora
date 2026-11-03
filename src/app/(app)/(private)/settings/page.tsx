import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Bell, Info, Key, PaintBrush, User } from "@/components/icons"
import { TopNavbar } from "@/components/layout/top-navbar"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-list"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

// Figma: Settings (91:2113). Private: the (private) layout is the gate, and the
// head shows the signed-in user's own profile (from the session, never the URL).
export const metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="page" backHref="/me" title="Settings" />
      <Suspense fallback={<SettingsFallback />}>
        <SettingsContent />
      </Suspense>
    </main>
  )
}

async function SettingsContent() {
  const user = await requireUser()
  const profile = await getProfileByUserId(user.id)
  if (!profile) redirect("/onboarding")

  return (
    <div className="flex flex-col pb-8">
      <div className="flex items-center gap-3 px-5 py-4">
        <Avatar src={profile.avatarUrl} name={user.name} size="lg" />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-title-s font-semibold text-textPrimary">{user.name}</p>
          <p className="truncate text-caption text-textSecondary">@{profile.username}</p>
        </div>
      </div>

      <SettingsSection title="Personalization">
        <SettingsRow icon={<User />} label="Edit profile" href="/settings/profile" />
        <SettingsRow icon={<PaintBrush />} label="Appearance" href="/settings/appearance" />
        <SettingsRow icon={<Bell />} label="Notifications" soon />
      </SettingsSection>

      <SettingsSection title="Security">
        <SettingsRow icon={<Key />} label="Change password" soon />
        <SettingsRow icon={<User />} label="Account" href="/settings/account" />
      </SettingsSection>

      <SettingsSection title="Wallet">
        <SettingsRow icon={<User />} label="Payout" href="/unavailable/wallet" soon />
      </SettingsSection>

      {/* No dedicated icons exist for these yet (TODO(icon): Scroll / ShieldCheck), so Info stands in. */}
      <SettingsSection title="Terms">
        <SettingsRow icon={<Info />} label="Terms of use" href="/terms?from=settings" />
        <SettingsRow icon={<Info />} label="Privacy policy" href="/privacy?from=settings" />
      </SettingsSection>
    </div>
  )
}

function SettingsFallback() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {["h-42", "h-28", "h-14", "h-28"].map((height) => (
        <div key={height} className="flex flex-col gap-2.5 px-5 py-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className={`${height} w-full`} />
        </div>
      ))}
    </div>
  )
}
