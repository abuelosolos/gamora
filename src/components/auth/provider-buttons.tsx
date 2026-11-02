"use client"

import * as React from "react"
import { Apple, Google } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

/**
 * Every button on the auth screens shares this size: full width, 60px tall,
 * radius 24 (Figma ProfileButtons).
 */
export const AUTH_BUTTON_CLASS = "h-15 min-h-15 w-full gap-1 rounded-ui-lg text-body"

/** Sends the user to Google. Better Auth redirects back to /onboarding, which routes on. */
function GoogleButton({ next, className }: { next: string; className?: string }) {
  const [pending, setPending] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  async function onClick() {
    setPending(true)
    setFailed(false)
    try {
      // The client returns { error } instead of throwing, and navigates itself on success.
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: `/onboarding?next=${encodeURIComponent(next)}`,
      })
      if (error) {
        setFailed(true)
        setPending(false)
      }
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        loading={pending}
        onClick={onClick}
        className={cn(
          AUTH_BUTTON_CLASS,
          // Icon and label use text-on-accent on the accent fill, also while loading.
          "bg-accentDefault text-textOnAccent disabled:bg-accentDefault disabled:text-textOnAccent",
          className
        )}
      >
        <Google className="size-6.75" aria-hidden="true" />
        Continue with Google
      </Button>
      {failed ? (
        <p role="alert" className="text-center text-caption text-statusError">
          Google sign-in did not start. Try again.
        </p>
      ) : null}
    </div>
  )
}

/**
 * Apple sign-in is not set up. Disabled: the Button's disabled fill (bgSurface)
 * with textSecondary for the logo and label. No badge, no label change.
 */
function AppleButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      disabled
      className={cn(
        AUTH_BUTTON_CLASS,
        "disabled:bg-bgSurface disabled:text-textSecondary",
        className
      )}
    >
      <Apple className="size-5.5" aria-hidden="true" />
      Continue with Apple
    </Button>
  )
}

export { GoogleButton, AppleButton }
