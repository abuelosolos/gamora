import { Suspense } from "react"
import { notFound } from "next/navigation"
import { FeedList } from "@/components/feed/feed-list"
import { TopNavbar } from "@/components/layout/top-navbar"
import { ProfileMenu } from "@/components/profile/profile-menu"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { getUser } from "@/server/auth/session"
import { listPostsByUsername, listProfileEvents } from "@/server/services/posts"
import { getPublicProfile } from "@/server/services/profile"
import { usernameSchema } from "@/server/validators/profile"
import { profileTabSchema } from "@/server/validators/posts"

// Public: readable signed out. Mine or someone else's is decided on the server
// from the session (profile.isOwner). Following and editing are server actions
// and need sign-in there. Everything that depends on the request sits inside
// Suspense, so the shell can render at once.
export const metadata = { title: "Profile" }

export default function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function ProfileContent({
  params,
  searchParams,
}: {
  params: PageProps<"/u/[username]">["params"]
  searchParams: PageProps<"/u/[username]">["searchParams"]
}) {
  const { username: rawUsername } = await params
  const parsed = usernameSchema.safeParse(rawUsername)
  if (!parsed.success) notFound()

  const { tab: rawTab } = await searchParams
  const parsedTab = profileTabSchema.safeParse(Array.isArray(rawTab) ? rawTab[0] : rawTab)
  const tab = parsedTab.success ? parsedTab.data : "activity"

  const viewer = await getUser()
  const viewerId = viewer?.id ?? null
  const [profile, page] = await Promise.all([
    getPublicProfile(parsed.data, viewerId),
    tab === "posts"
      ? listPostsByUsername({ username: parsed.data, cursor: null, viewerId })
      : tab === "subscribed"
        ? null
        : listProfileEvents({ username: parsed.data, section: tab, cursor: null, viewerId }),
  ])
  if (!profile) notFound()

  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="profile" backHref="/feed" more={<ProfileMenu isOwner={profile.isOwner} username={profile.username} />} />
      <ProfileHeader profile={profile} />
      <ProfileTabs username={profile.username} active={tab} />
      {page ? (
        <FeedList
          key={`${profile.username}-${tab}`}
          source={{ kind: "profile", username: profile.username, isOwner: profile.isOwner, tab }}
          initial={page}
        />
      ) : (
        // Subscribed Posts: no subscriptions yet (the tab itself opens the Coming soon screen).
        <EmptyState title="Nothing here yet" description="This section is coming soon." />
      )}
    </main>
  )
}
