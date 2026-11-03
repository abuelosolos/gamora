"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckCircle } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Round selection control. Unchecked: an empty ring. Checked: the CheckCircle
 * icon in the accent colour. The visible control is 24px; the hit area is
 * supplied by the row that contains it (44px+), or by `className` padding.
 * TODO(icon): a plain Check icon is not in src/components/icons, so CheckCircle stands in.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox relative flex size-6 shrink-0 items-center justify-center rounded-full border border-borderStrong bg-transparent outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:border-transparent",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="absolute -inset-px flex items-center justify-center text-accentDefault">
        <CheckCircle aria-hidden="true" className="size-6" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
