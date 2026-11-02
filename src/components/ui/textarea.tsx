import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.ComponentProps<"textarea">

/** Multi-line input. Same states as Input; grows with field-sizing where supported. */
function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full min-w-0 resize-y rounded-ui-md border border-borderStrong bg-bgDefault px-4 py-3 text-body text-textPrimary transition-colors duration-200 outline-none placeholder:text-textSecondary focus-visible:border-accentDefault focus-visible:ring-2 focus-visible:ring-accentDefault disabled:cursor-not-allowed disabled:resize-none disabled:border-borderDefault disabled:bg-bgSurface disabled:text-textDisabled aria-invalid:border-statusError aria-invalid:focus-visible:ring-statusError",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
