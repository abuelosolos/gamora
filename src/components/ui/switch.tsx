"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/**
 * Figma: Toggle (55 x 24 track, 22px thumb). Off: borderDefault track with a
 * textPrimary thumb on the left. On: accent track with a textOnAccent thumb on
 * the right. An invisible pseudo-element grows the hit area to 44px high.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-6 w-13.75 shrink-0 items-center rounded-full bg-borderDefault p-px transition-colors duration-200 outline-none before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-accentDefault motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5.5 translate-x-0.75 rounded-full bg-textPrimary transition-transform duration-200 data-[state=checked]:translate-x-8.75 data-[state=checked]:bg-textOnAccent motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
