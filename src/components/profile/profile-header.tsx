import { ProfileCategories } from "@/components/profile/profile-categories"
import { ProfileSocial } from "@/components/profile/profile-social"
import { Avatar } from "@/components/ui/avatar"
import type { PublicProfile } from "@/server/services/profile"

/**
 * Figma: ProfileHead, FollowCount, bio and Edit/Share (own) or Follow (other),
 * from "Profile(Possible build)" and "Profile(Inspect)". One component for both
 * screens: `profile.isOwner` (decided on the server) switches Edit for Follow.
 *
 * Deviations from the design:
 *  - The own-profile frame stacks the avatar over a cover photo. There is no
 *    cover photo in the data, so both screens use the side-by-side head from
 *    the other-artist frame.
 *  - Subscribers is always 0 and Subscribe opens Coming soon (no subscriptions yet).
 */
function ProfileHeader({ profile }: { profile: PublicProfile }) {
  return (
    <section aria-label={`${profile.name}'s profile`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={profile.avatarUrl} name={profile.name} className="size-14" />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-title-s font-semibold text-textPrimary">{profile.name}</h1>
            <p className="truncate text-caption text-textSecondary">@{profile.username}</p>
          </div>
        </div>
        <ProfileCategories categories={profile.categories} />
      </div>

      <ProfileSocial
        username={profile.username}
        isOwner={profile.isOwner}
        viewerFollows={profile.viewerFollows}
        followerCount={profile.followerCount}
        followingCount={profile.followingCount}
        subscriberCount={profile.subscriberCount}
      >
        {profile.bio ? (
          <p className="px-5 py-2.5 text-caption wrap-break-word whitespace-pre-wrap text-textPrimary">
            {profile.bio}
          </p>
        ) : null}
      </ProfileSocial>
    </section>
  )
}

export { ProfileHeader }
