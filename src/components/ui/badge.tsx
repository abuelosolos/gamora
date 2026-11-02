import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Small status label. Colors come from the status tokens, always paired with
 * text (never color alone). Not interactive.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-borderDefault bg-bgSurface text-textSecondary",
        accent: "border-transparent bg-accentSubtle text-accentDefault",
        success: "border-statusSuccess bg-transparent text-statusSuccess",
        warning: "border-statusWarning bg-transparent text-statusWarning",
        error: "border-statusError bg-transparent text-statusError",
        info: "border-statusInfo bg-transparent text-statusInfo",
        premium: "border-premiumLock bg-transparent text-premiumLock",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
