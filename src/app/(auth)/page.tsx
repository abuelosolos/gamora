import Link from "next/link"
import { AppleButton, GoogleButton, AUTH_BUTTON_CLASS } from "@/components/auth/provider-buttons"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shared/logo"

/**
 * Figma: Auth (welcome). Logo and wordmark, tagline, provider buttons,
 * "Continue without an account" and the legal links.
 *
 * Matches Figma: three buttons, no extra links. The email form lives at
 * /sign-in (also where the proxy sends signed-out visitors).
 */
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col px-6">
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Logo title="Gamora" className="size-28" />
          <p className="font-wordmark text-display text-accentDefault">GAMORA</p>
        </div>
        <div className="mt-10 flex flex-col items-center text-center">
          <h1 className="font-display text-title-m font-semibold text-textPrimary">
            The extensive art gallery
          </h1>
          <p className="text-body-sm text-textSecondary">A freelance platform for all artists</p>
        </div>
        <div className="mt-12 flex w-full flex-col gap-2.5">
          <AppleButton />
          <GoogleButton next="/feed" />
          <Button asChild variant="outline-accent" className={AUTH_BUTTON_CLASS}>
            <Link href="/feed">Continue without an account</Link>
          </Button>
        </div>
      </div>
      <nav
        aria-label="Legal"
        className="flex items-center justify-center gap-3.5 pb-6 text-body-sm text-textSecondary"
      >
        <Link href="/terms" className="inline-flex min-h-11 items-center hover:underline">
          Terms of use
        </Link>
        <span aria-hidden="true" className="h-6 w-px bg-borderStrong" />
        <Link href="/privacy" className="inline-flex min-h-11 items-center hover:underline">
          Privacy policy
        </Link>
      </nav>
    </main>
  )
}
