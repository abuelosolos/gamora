import type { Metadata } from "next"
import { ContactLink, LegalList, LegalPage, LegalSection, legalBackHref } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Terms of use" }

// Reads searchParams per request (the back arrow depends on where you came from).
export const instant = false

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>
}) {
  const { from } = await searchParams
  return (
    <LegalPage title="Terms of use" backHref={legalBackHref(from)}>
      <LegalSection title="What this is">
        <p>
          Gamora is a portfolio project: a working demo of an app for artists, built by one person. It is not a company
          or a commercial service, and it can change, be reset or be shut down at any time without notice.
        </p>
      </LegalSection>
      <LegalSection title="Your posts are public">
        <p>
          Anything you post, reply with, or put on your profile (your name, username, bio, picture and artwork) can be
          seen by anyone, including people who are not signed in. Do not post anything you want to keep private.
        </p>
      </LegalSection>
      <LegalSection title="Your work">
        <p>
          You keep the rights to what you upload. By posting it you let Gamora show it in the app. Only upload work you
          made or have permission to share.
        </p>
      </LegalSection>
      <LegalSection title="Rules">
        <LegalList
          items={[
            "No illegal content, harassment, hate, spam or content that violates someone else's rights.",
            "No attempts to break, overload or get around the app's protections.",
            "One person, one account. Do not pretend to be someone else.",
          ]}
        />
        <p>
          Anyone can report a post, reply or profile. The owner reviews reports and may remove content or accounts that
          break these rules.
        </p>
      </LegalSection>
      <LegalSection title="Sample content and jobs">
        <p>
          Accounts ending in <span className="text-textPrimary">_demo</span>, their posts, and every job on the Jobs
          screen are invented samples, marked as such. Nobody is hiring through Gamora, and applying to a sample job
          does not reach a real employer. Wallet, chat, shop, subscriptions and the hirer side are not available.
        </p>
      </LegalSection>
      <LegalSection title="No warranty">
        <p>
          Gamora is provided as is, with no promises about availability or that your content will be kept. Keep your own
          copies of your artwork. To the extent the law allows, the owner is not liable for losses from using the app.
        </p>
      </LegalSection>
      <LegalSection title="Deleting your account">
        <p>
          You can delete your account at any time in Settings, then Account, then Delete account. It cannot be undone.
          See the Privacy policy for what is removed.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions, reports or takedown requests: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
