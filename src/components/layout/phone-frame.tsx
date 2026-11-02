import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * App frame. On phones the app fills the screen. From the md breakpoint up it
 * renders as a 390px phone-shaped column centered on a neutral backdrop.
 * The frame scrolls on its own, so sticky bars (TopBar, BottomNav) stay inside it.
 */
function PhoneFrame({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-frame-backdrop"
      className="min-h-dvh bg-bgDefault md:flex md:h-dvh md:items-center md:justify-center md:bg-bgSurface md:p-6"
    >
      <div
        data-slot="phone-frame"
        className={cn(
          "relative flex min-h-dvh w-full flex-col bg-bgDefault text-textPrimary md:h-full md:max-h-211 md:min-h-0 md:w-97.5 md:overflow-y-auto md:rounded-ui-lg md:border md:border-borderDefault md:shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export { PhoneFrame }
