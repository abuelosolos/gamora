import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * Figma: ProfileButtons (Fill, Outline) and the popup buttons (accent fill and
 * accent outline). Body/Medium 15/22, padding 20/10, 44px touch target.
 *
 * Variant names `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
 * and every size name are kept because the shadcn dialog, drawer and
 * alert-dialog use them.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-ui-md border border-transparent text-body font-medium whitespace-nowrap transition-colors duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault disabled:pointer-events-none disabled:text-textDisabled aria-disabled:pointer-events-none aria-disabled:text-textDisabled aria-invalid:border-statusError [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // accent fill (popup "Continue Applying")
        default:
          "bg-accentDefault text-textOnAccent hover:bg-accentPressed active:bg-accentPressed disabled:bg-bgSurface aria-disabled:bg-bgSurface",
        // neutral fill (Figma ProfileButtonFill)
        secondary:
          "bg-borderStrong text-textPrimary hover:bg-borderDefault active:bg-borderDefault disabled:bg-bgSurface aria-disabled:bg-bgSurface",
        // neutral outline (Figma ProfileButtonOutline)
        outline:
          "border-borderStrong bg-transparent text-textPrimary hover:bg-bgSurface active:bg-bgSurface disabled:border-borderDefault aria-disabled:border-borderDefault",
        // accent outline (popup "Clear")
        "outline-accent":
          "border-accentDefault bg-transparent text-accentDefault hover:bg-accentSubtle active:bg-accentSubtle disabled:border-borderDefault aria-disabled:border-borderDefault",
        ghost:
          "bg-transparent text-textPrimary hover:bg-bgSurface active:bg-bgSurface",
        destructive:
          "bg-statusError text-textOnAccent hover:opacity-90 active:opacity-90 disabled:bg-bgSurface aria-disabled:bg-bgSurface",
        link: "text-accentDefault underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        xs: "min-h-11 px-3 py-1 text-caption",
        sm: "min-h-11 px-4 py-2 text-body-sm",
        lg: "min-h-12 px-6 py-3 text-body",
        icon: "size-11",
        "icon-xs": "size-11 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-11 [&_svg:not([class*='size-'])]:size-5",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a busy state: disables the button and sets aria-busy. */
  loading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  fullWidth = false,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
