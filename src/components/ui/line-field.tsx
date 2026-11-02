import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Figma: the Edit profile fields. Just text on a line: no box, no radius, no
 * fill. The line is borderStrong, turns accent and thickens when the field has
 * focus (that is the visible focus mark), and turns red when aria-invalid.
 *
 * Use with a real <label> (it can be sr-only). Placeholder text uses
 * textSecondary because the design's textDisabled grey is under 4.5:1.
 */
const lineBase =
  "w-full min-w-0 rounded-none border-0 border-b border-borderStrong bg-transparent px-0 py-2.5 text-caption text-textPrimary outline-none transition-colors duration-200 placeholder:text-textSecondary focus-visible:border-b-2 focus-visible:border-accentDefault disabled:cursor-not-allowed disabled:text-textDisabled aria-invalid:border-statusError"

function LineInput({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="line-input" className={cn(lineBase, "min-h-11", className)} {...props} />
}

function LineTextarea({ className, rows = 2, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      data-slot="line-textarea"
      className={cn(lineBase, "min-h-11 resize-none field-sizing-content", className)}
      {...props}
    />
  )
}

export { LineInput, LineTextarea, lineBase }
