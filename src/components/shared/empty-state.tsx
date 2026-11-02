import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.ComponentProps<"section">, "title"> {
  /** Optional icon from src/components/icons. Decorative, so it is hidden from screen readers. */
  icon?: React.ReactNode
  title: string
  description?: string
  /** Usually a <Button>. */
  action?: React.ReactNode
  /** Heading level for the title. Default h2. */
  headingLevel?: "h1" | "h2" | "h3"
}

/** Centered message for lists and screens that have nothing to show yet. */
function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel: Heading = "h2",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <section
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="text-textSecondary [&_svg]:size-12">
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-72 flex-col gap-1.5">
        <Heading className="font-display text-title-s font-semibold text-textPrimary">
          {title}
        </Heading>
        {description ? (
          <p className="text-body-sm text-textSecondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  )
}

export { EmptyState }
