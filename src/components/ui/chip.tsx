import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Figma: Pills (pillFill, pillOutline) and the accent pill used for the active
 * "Posts" tab. Caption 12/16, padding 10/5, min width 50.
 *
 * The visible pill is 28px tall; an invisible pseudo-element extends the hit
 * area to the 44px touch target.
 */
const chipVariants = cva(
  "relative inline-flex min-w-12.5 items-center justify-center rounded-ui-sm border px-2.5 py-1.25 text-center text-caption whitespace-nowrap transition-colors duration-200 outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault disabled:pointer-events-none disabled:text-textDisabled",
  {
    variants: {
      variant: {
        fill: "border-borderDefault bg-borderDefault text-textPrimary hover:bg-borderStrong",
        outline: "border-borderDefault bg-transparent text-textPrimary hover:bg-bgSurface",
        selected: "border-accentDefault bg-accentDefault text-textOnAccent hover:bg-accentPressed",
      },
    },
    defaultVariants: { variant: "outline" },
  }
)

export interface ChipProps
  extends Omit<React.ComponentProps<"button">, "type">,
    VariantProps<typeof chipVariants> {
  /** Toggle state. Sets aria-pressed and uses the selected look. */
  selected?: boolean
}

function Chip({ className, variant, selected, children, ...props }: ChipProps) {
  const resolved = selected ? "selected" : (variant ?? "outline")
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected === undefined ? undefined : selected}
      className={cn(chipVariants({ variant: resolved }), className)}
      {...props}
    >
      {children}
    </button>
  )
}

export { Chip, chipVariants }
