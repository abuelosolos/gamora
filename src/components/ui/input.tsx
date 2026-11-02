import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.ComponentProps<"input">

/**
 * Text input. Pair it with a real <label htmlFor> and set aria-invalid when the
 * value is wrong; the error styling follows aria-invalid.
 */
function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-ui-md border border-borderStrong bg-bgDefault px-4 py-2.5 text-body text-textPrimary transition-colors duration-200 outline-none placeholder:text-textSecondary focus-visible:border-accentDefault focus-visible:ring-2 focus-visible:ring-accentDefault disabled:cursor-not-allowed disabled:border-borderDefault disabled:bg-bgSurface disabled:text-textDisabled aria-invalid:border-statusError aria-invalid:focus-visible:ring-statusError",
        className
      )}
      {...props}
    />
  )
}

export { Input }
