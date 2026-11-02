"use client"

import * as React from "react"
import Link from "next/link"
import { useFollow } from "@/components/feed/use-follow"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

/**
 * Figma: FollowCount, then the bio, then Edit/Share (own profile) or
 * Follow (another artist's). One client component because the follower count
 * and the Follow button share state: pressing Follow moves the count at once,
 * and both go back if the server refuses (see useFollow).
 *
 * The bio arrives as children so it can stay a server-rendered text node
 * between the counts and the buttons.
 *
 * Another artist's profile has Subscribe (accent fill) and Follow (accent
 * outline); Share is only on your own profile, as in the design.
 *
 * Deviations from the design: subscriptions are not available yet, so the
 * Subscribers count is 0 and Subscribe opens the Coming soon screen.
 */
export interface ProfileSocialProps {
  username: string
  isOwner: boolean
  viewerFollows: boolean
  followerCount: number
  followingCount: number
  subscriberCount: number
  children?: React.ReactNode
}

const countFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

function Count({ value, label }: { value: number; label: string }) {
  return (
    // The term comes first in the markup (required for a description list); the
    // number is shown before it.
    <div className="flex flex-row-reverse items-center justify-end gap-1.5">
      <dt className="text-caption text-textSecondary">{label}</dt>
      <dd className="text-body font-medium text-textPrimary">{countFormat.format(value)}</dd>
    </div>
  )
}

function ProfileSocial({
  username,
  isOwner,
  viewerFollows,
  followerCount,
  followingCount,
  subscriberCount,
  children,
}: ProfileSocialProps) {
  const { toast } = useToast()
  const { following, toggle } = useFollow(username, viewerFollows)

  // The server count already includes the viewer's follow if there was one.
  const delta = Number(following) - Number(viewerFollows)
  const followers = Math.max(0, followerCount + delta)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`)
      toast({ variant: "success", title: "Link copied" })
    } catch {
      toast({ variant: "error", title: "Could not copy the link" })
    }
  }

  return (
    <>
      <dl className="flex items-center gap-4 px-5 pt-2.5">
        <Count value={followers} label={followers === 1 ? "Follower" : "Followers"} />
        <Count value={followingCount} label="Following" />
        <Count value={subscriberCount} label={subscriberCount === 1 ? "Subscriber" : "Subscribers"} />
      </dl>

      {children}

      <div className="flex items-center gap-3 px-5 py-2.5">
        {isOwner ? (
          <>
            <Button variant="secondary" className="min-w-0 flex-1" onClick={() => void copyLink()}>
              Share
            </Button>
            <Button asChild variant="outline-accent" className="min-w-0 flex-1">
              <Link href="/settings/profile">Edit Profile</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild className="min-w-0 flex-1">
              <Link href="/unavailable/subscriptions">Subscribe</Link>
            </Button>
            <Button
              variant={following ? "outline" : "outline-accent"}
              aria-pressed={following}
              className="min-w-0 flex-1"
              onClick={() => void toggle()}
            >
              {following ? "Following" : "Follow"}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

export { ProfileSocial }
