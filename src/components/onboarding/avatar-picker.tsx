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
}

function AvatarPicker({ src, name, busy = false, error, onPick }: AvatarPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div data-slot="avatar-picker" className="flex flex-1 flex-col items-center justify-center gap-4">
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
          "relative flex size-32 items-center justify-center overflow-hidden rounded-full bg-borderStrong text-textPrimary outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-accentDefault focus-visible:ring-offset-2 focus-visible:ring-offset-bgDefault",
          busy && "opacity-60"
        )}
      >
        {src ? (
          <Avatar src={src} name={name} className="size-full border-0" />
        ) : (
          <Camera className="size-12" aria-hidden="true" />
        )}
      </button>
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
    </div>
  )
}

export { AvatarPicker }
