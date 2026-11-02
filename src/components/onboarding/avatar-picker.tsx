"use client"

import * as React from "react"
import { Camera } from "@/components/icons"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/**
 * Figma: "Upload profile picture". A large circle with a camera icon; after a
 * file is chosen the circle shows a preview. The file input is a real input
 * behind a labelled button, so keyboard and screen readers work.
 */
export interface AvatarPickerProps {
  /** Object URL or stored URL to preview. */
  src?: string | null
  /** Used for the preview's alt text. */
  name: string
  busy?: boolean
  error?: string | null
  onPick: (file: File) => void
  /**
   * Edit profile (Figma "Settings (Edit Profile)"): a 56px circle, no caption.
   * The caller shows the busy and error messages itself, next to its own fields.
   * With a picture set, a small camera badge marks it as changeable.
   */
  compact?: boolean
}

function AvatarPicker({ src, name, busy = false, error, onPick, compact = false }: AvatarPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div
      data-slot="avatar-picker"
      className={cn(compact ? "shrink-0" : "flex flex-1 flex-col items-center justify-center gap-4")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.target.value = ""
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={src ? "Change profile picture" : "Choose a profile picture"}
        className={cn(
          "relative flex items-center justify-center rounded-full bg-borderStrong text-textPrimary outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault",
          compact ? "size-14" : "size-32",
          busy && "opacity-60"
        )}
      >
        {src ? (
          <Avatar src={src} name={name} className="size-full border-0" />
        ) : (
          <Camera className={compact ? "size-7.5" : "size-12"} aria-hidden="true" />
        )}
        {compact && src ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-borderStrong bg-bgElevated text-textPrimary"
          >
            <Camera className="size-4" />
          </span>
        ) : null}
      </button>
      {compact ? null : (
        <>
          <p className="text-caption text-textSecondary">JPEG, PNG or WebP, up to 2 MB</p>
          {busy ? (
            <p role="status" className="text-caption text-textSecondary">
              Uploading…
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-caption text-statusError">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export { AvatarPicker }
