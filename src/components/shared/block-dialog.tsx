"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { blockUserAction } from "@/server/actions/blocks"

export interface BlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Public username of the person to block. */
  username: string
  /** Called after the server confirmed the block (the caller leaves the page or refreshes). */
  onBlocked?: () => void
}

/**
 * Confirm dialog for blocking someone. Blocking is hidden both ways, so the
 * text says what changes. The dialog stays open until the server answers.
 */
function BlockDialog({ open, onOpenChange, username, onBlocked }: BlockDialogProps) {
  const { toast } = useToast()
  const [pending, startTransition] = React.useTransition()

  function confirm(event: React.MouseEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await blockUserAction({ username })
      onOpenChange(false)
      if (!result.ok) {
        toast({ variant: "error", title: result.message })
        return
      }
      toast({ variant: "success", title: `Blocked @${username}` })
      onBlocked?.()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block @{username}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will not see each other&apos;s posts or profiles, and neither of you can follow, like or reply to the
            other. Any follow between you is removed. They are not told. You can unblock them in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? "Blocking…" : "Block"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { BlockDialog }
