import { Suspense } from "react"
import { notFound } from "next/navigation"
import { TopNavbar } from "@/components/layout/top-navbar"
import { DeleteAccount } from "@/components/settings/delete-account"
import { SettingsSection } from "@/components/settings/settings-list"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { getAccountInfo } from "@/server/services/account"

// No Figma frame (Settings has an "Account Info" row only). Private: shows the
// signed-in user's own details, so the email is only ever shown to its owner.
export const metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="page" backHref="/settings" title="Account" />
      <Suspense fallback={<AccountFallback />}>
        <AccountContent />
      </Suspense>
    </main>
  )
}

const joinedFormat = new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" })

async function AccountContent() {
  const user = await requireUser()
  const info = await getAccountInfo(user.id)
  if (!info) notFound()

  return (
    <div className="flex flex-col pb-8">
      <SettingsSection title="Account info">
        <Detail label="Name" value={info.name} />
        <Detail label="Email" value={info.email} />
        <Detail label="Joined" value={joinedFormat.format(info.createdAt)} />
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <li>
          <DeleteAccount />
        </li>
      </SettingsSection>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 border-b border-borderDefault px-5 py-4 last:border-b-0">
      <span className="text-caption text-textSecondary">{label}</span>
      <span className="min-w-0 truncate text-caption text-textPrimary">{value}</span>
    </li>
  )
}

function AccountFallback() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="flex flex-col">
      <div className="flex flex-col gap-2.5 px-5 py-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-42 w-full" />
      </div>
      <div className="flex flex-col gap-2.5 px-5 py-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  )
}
