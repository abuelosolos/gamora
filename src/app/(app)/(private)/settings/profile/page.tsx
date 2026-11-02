import { Suspense } from "react"
import { redirect } from "next/navigation"
import { TopNavbar } from "@/components/layout/top-navbar"
import { EditProfileForm } from "@/components/profile/edit-profile-form"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { getProfileByUserId } from "@/server/services/profile"

// Private: the (private) layout is the real gate. The profile loaded here is
// always the signed-in user's own (taken from the session, never from the URL),
// and updateProfileAction checks the session again.
export const metadata = { title: "Edit profile" }

export default function EditProfilePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<EditProfileFallback />}>
        <EditProfileContent />
      </Suspense>
    </main>
  )
}

async function EditProfileContent() {
  const user = await requireUser()
  const profile = await getProfileByUserId(user.id)
  if (!profile) redirect("/onboarding")

  return (
    <EditProfileForm
      initial={{
        displayName: user.name,
        username: profile.username,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        categories: profile.categories,
        location: profile.location,
        birthday: profile.birthday,
      }}
    />
  )
}

function EditProfileFallback() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col" aria-busy="true">
      <TopNavbar variant="settings" backHref="/me" formId="loading" canSave={false} />
      <div className="flex items-start gap-4 px-5 pt-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-8">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}
