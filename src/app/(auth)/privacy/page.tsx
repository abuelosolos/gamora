import type { Metadata } from "next"
import { ContactLink, LegalList, LegalPage, LegalSection, legalBackHref } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Privacy policy" }

// Reads searchParams per request (the back arrow depends on where you came from).
export const instant = false

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>
}) {
  const { from } = await searchParams
  return (
    <LegalPage title="Privacy policy" backHref={legalBackHref(from)}>
      <LegalSection title="Short version">
        <p>
          Gamora is a portfolio project. It stores what you give it so the app works, shows your posts and profile to
          everyone, does not sell or share your data for advertising, and has no analytics or ad trackers.
        </p>
      </LegalSection>
      <LegalSection title="What is stored">
        <LegalList
          items={[
            "Account: your email address, your name, and a hashed password (or, if you use Google, your Google account id). Passwords are never stored in plain text.",
            "Sign-in sessions: a session token, when it expires, and the IP address and browser type it was created from.",
            "Profile: username, bio, profile picture, interests, art categories and location. Your birthday, if you add it, is private and only you can see it.",
            "Content: your posts, replies and uploaded images, plus your likes, saved posts, reposts and follows. Images are re-encoded on upload, which removes location and camera data.",
            "Jobs: the sample jobs you apply to, your note and the works you attached.",
            "Search history: your recent searches and profiles you opened, shown only to you. Clear it any time in Search.",
            "Reports: reports you send (reason and note) and, for the owner, a log of moderation actions.",
            "Notifications: who liked, followed or replied to you.",
          ]}
        />
      </LegalSection>
      <LegalSection title="What is public">
        <p>
          Your username, display name, bio, profile picture, categories, posts, replies, reposts, likes (what you liked and when), follower
          counts and uploaded images are visible to anyone, signed in or not. Your email, birthday, saved posts, search history, reports and
          sessions are not.
        </p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>
          Gamora sets a sign-in session cookie and a theme cookie that remembers your colour choice. Nothing else.
        </p>
      </LegalSection>
      <LegalSection title="Who handles the data">
        <p>
          The app uses a few services to run: Vercel (hosting and image storage), Neon (database), Upstash (short-lived
          rate-limit counters, which use your IP address or a hash of your email), and Google if you choose Google
          sign-in. Server logs may briefly include IP addresses for rate-limit and failed sign-in events.
        </p>
      </LegalSection>
      <LegalSection title="Deleting your account and data">
        <p>
          Go to Settings, then Account, then Delete account, and confirm. This permanently removes your account,
          sessions, profile, posts, replies, uploaded pictures, likes, follows, notifications, search history and job
          applications. Reports you sent stay without your name attached, so moderation records are not lost. Backups
          kept by the database provider may hold copies for a short time before they expire.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          To ask what is stored about you, or to have something removed if you cannot sign in: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
