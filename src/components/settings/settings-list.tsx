import * as React from "react"
import Link from "next/link"
import { CaretRight } from "@/components/icons"
import { ComingSoonBadge } from "@/components/shared/coming-soon"
import { cn } from "@/lib/utils"

/**
 * Figma: SettingCont (a 54px row: 20px icon, caption label, CaretRight) inside
 * a section with a caption heading and a rounded card around its rows.
 *
 * Deviations: the card's 0 0 2px shadow is a 1px borderDefault line (no shadow
 * token), the corner is the 16px radius from the scale (Figma uses 12), and the
 * row padding is 16px (Figma 15). A row with `soon` and no `href` is not a link: it shows the
 * Coming soon badge and is hidden from the tab order. With an `href` it is a
 * link to the Coming soon screen and keeps the badge.
 */
function SettingsSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  const headingId = React.useId()
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-2.5 px-5 py-2.5", className)}>
      <h2 id={headingId} className="text-caption text-textPrimary">
        {title}
      </h2>
      <ul className="flex flex-col overflow-hidden rounded-ui-md border border-borderDefault bg-bgDefault">
        {children}
      </ul>
    </section>
  )
}

const rowClass =
  "flex min-h-14 w-full items-center gap-1.5 px-5 py-4 text-caption text-textSecondary [&_svg]:shrink-0"

function SettingsRow({
  icon,
  label,
  href,
  soon,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  /** Where the row goes. Leave out together with `soon` for a row that is not built yet. */
  href?: string
  soon?: boolean
  tone?: "default" | "danger"
}) {
  const content = (
    <>
      <span aria-hidden="true" className="flex size-5 items-center justify-center [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {soon ? <ComingSoonBadge /> : <CaretRight aria-hidden="true" className="size-6" />}
    </>
  )

  return (
    <li className="border-b border-borderDefault last:border-b-0">
      {href ? (
        <Link
          href={href}
          className={cn(
            rowClass,
            "outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault",
            tone === "danger" && "text-statusError"
          )}
        >
          {content}
        </Link>
      ) : (
        <div aria-disabled="true" className={cn(rowClass, "text-textDisabled")}>
          {content}
        </div>
      )}
    </li>
  )
}

export { SettingsRow, SettingsSection }
