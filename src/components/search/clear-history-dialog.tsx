"use client"

import * as React from "react"
import { EraserFill, XCircleFill } from "@/components/icons"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { clearSearchHistoryAction } from "@/server/actions/search"

/**
 * Figma: "Search (History Delete)" popup. The XCircleFill beside "Recent" opens
 * a centered card (bgSurface, 24px corners): eraser icon, "Clear Search
 * History", one line of explanation, then Cancel (filled, the safe choice) and
 * Clear (outline). Nothing is deleted until Clear is pressed; while it runs the
 * dialog stays open with both buttons off, and a failure is shown inside it.
 */
export interface ClearHistoryDialogProps {
  onCleared: () => void
}

function ClearHistoryDialog({ onCleared }: ClearHistoryDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onConfirm(event: React.MouseEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await clearSearchHistoryAction()
      if (!result.ok) {
        setError(result.message)
        return
      }
      onCleared()
      setOpen(false)
    } catch {
      setError("Could not clear your history. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label="Clear search history"
          className="flex size-11 items-center justify-center rounded-full text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
        >
          <XCircleFill aria-hidden="true" className="size-6" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="items-center gap-3 rounded-ui-lg bg-bgSurface p-5 text-center text-textPrimary">
        <AlertDialogHeader className="place-items-center gap-1.5 text-center sm:group-data-[size=default]/alert-dialog-content:place-items-center sm:group-data-[size=default]/alert-dialog-content:text-center">
          <AlertDialogMedia className="mb-1 size-18 bg-transparent text-accentDefault sm:group-data-[size=default]/alert-dialog-content:row-span-1 *:[svg:not([class*='size-'])]:size-18">
            <EraserFill aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-display text-title-s font-semibold text-textPrimary">
            Clear Search History
          </AlertDialogTitle>
          <AlertDialogDescription className="text-caption text-textSecondary">
            Continuing with this action will clear all recent searches
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-caption text-statusError">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter className="m-0 grid grid-cols-2 gap-2.5 border-0 bg-transparent p-0">
          <AlertDialogCancel variant="default" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction variant="outline-accent" disabled={pending} onClick={onConfirm}>
            {pending ? "Clearing…" : "Clear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ClearHistoryDialog }
