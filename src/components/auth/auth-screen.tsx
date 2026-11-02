import * as React from "react"
import Link from "next/link"
import { CaretLeft } from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { Logo } from "@/components/shared/logo"
import { cn } from "@/lib/utils"

/**
 * Figma: Auth screens (sign-up wizard steps). Back arrow left, logo mark right,
 * a title, the step content, and a primary action pinned to the bottom with an
 * optional "Skip for now" above it.
 *
 * Back is a link (`backHref`) or a callback (`onBack`); with neither, the slot
 * stays empty so the bar does not jump between steps.
 */
export interface AuthScreenProps {
  title: string
  description?: string
  backHref?: string
  onBack?: () => void
  /** Pinned to the bottom of the screen: the primary button and optional skip. */
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

function AuthScreen({ title, description, backHref, onBack, footer, className, children }: AuthScreenProps) {
  return (
    <div data-slot="auth-screen" className="flex min-h-dvh flex-1 flex-col md:min-h-0">
      <TopBar
        leading={
          backHref ? (
            <TopBarButton label="Back" asChild>
              <Link href={backHref}>
                <CaretLeft />
              </Link>
            </TopBarButton>
          ) : onBack ? (
            <TopBarButton label="Back" onClick={onBack}>
              <CaretLeft />
            </TopBarButton>
          ) : (
            <span className="size-11" aria-hidden="true" />
          )
        }
        trailing={<Logo className="mr-2.5" />}
      />
      <main className={cn("flex flex-1 flex-col gap-4 px-5 pt-2", className)}>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-title-s font-semibold text-textPrimary">{title}</h1>
          {description ? <p className="text-body-sm text-textSecondary">{description}</p> : null}
        </div>
        {children}
      </main>
      {footer ? <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-8">{footer}</div> : null}
    </div>
  )
}

export { AuthScreen }
