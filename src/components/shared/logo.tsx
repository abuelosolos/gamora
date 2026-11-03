import * as React from "react"
import { LOGO_SHAPES, LOGO_VIEWBOX } from "@/components/shared/logo-paths"
import { cn } from "@/lib/utils"

/**
 * Gamora logo (two-tone origami bird). Paths come from
 * src/assets/logo/logo.svg; the two tones are theme tokens
 * (logoPrimary, logoSecondary) so no color value lives in this file.
 *
 * Decorative by default. Pass `title` when the logo stands alone and needs a name.
 */
export interface LogoProps extends Omit<React.ComponentProps<"svg">, "children"> {
  title?: string
}

function Logo({ title, className, ...props }: LogoProps) {
  return (
    <svg
      data-slot="logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_VIEWBOX}
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-7.5 shrink-0", className)}
      {...props}
    >
      {LOGO_SHAPES.map((shape) => (
        <path
          key={shape.id}
          className={shape.tone === "logoPrimary" ? "fill-logoPrimary" : "fill-logoSecondary"}
          d={shape.d}
        />
      ))}
    </svg>
  )
}

export { Logo }
