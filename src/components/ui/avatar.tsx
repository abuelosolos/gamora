import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/** Figma: Profile avatar, a circle with a 1px borderStrong ring (30px in the top bar). */
const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderStrong bg-bgSurface align-middle select-none",
  {
    variants: {
      size: {
        xs: "size-6 text-caption",
        sm: "size-7.5 text-caption",
        md: "size-10 text-body-sm",
        lg: "size-16 text-title-s",
        xl: "size-24 text-title-l",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export interface AvatarProps
  extends Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, "children">,
    VariantProps<typeof avatarVariants> {
  /** Image URL from the database. Falls back to initials if missing or broken. */
  src?: string | null
  /** Display name. Used for the alt text and for the initials fallback. */
  name: string
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]!.charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : ""
  return (first + last).toUpperCase()
}

function Avatar({ className, size, src, name, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image
          data-slot="avatar-image"
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        aria-label={name}
        className="flex size-full items-center justify-center font-medium text-textSecondary"
      >
        {initialsOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export { Avatar, avatarVariants }
