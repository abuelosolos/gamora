import * as React from "react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { SITE } from "@/lib/site"

/**
 * Shared shell for Terms and Privacy: the auth screen frame (back arrow, logo),
 * a title, a "last updated" line and plain sections. No Figma frame exists for
 * these, so they are composed from existing type styles and tokens.
 */
function LegalPage({ title, backHref = "/", children }: { title: string; backHref?: string; children: React.ReactNode }) {
  return (
    <AuthScreen title={title} description={`Last updated ${SITE.legalUpdated}`} backHref={backHref} className="pb-10">
      <div className="flex flex-col gap-6 text-body-sm text-textSecondary">{children}</div>
    </AuthScreen>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-body font-medium text-textPrimary">
        {title}
      </h2>
      {children}
    </section>
  )
}

function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

function ContactLink() {
  return (
    <a
      href={SITE.contact.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accentDefault underline-offset-4 hover:underline"
    >
      {SITE.contact.label}
    </a>
  )
}

/** Back target for the legal pages: Settings when opened from there, the start page otherwise. Only these two values are accepted. */
function legalBackHref(from: string | string[] | undefined): string {
  return from === "settings" ? "/settings" : "/"
}

export { legalBackHref, ContactLink, LegalList, LegalPage, LegalSection }
