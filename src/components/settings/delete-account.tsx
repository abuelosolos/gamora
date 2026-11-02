"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@/components/icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { authClient } from "@/lib/auth-client"
import { deleteAccountAction } from "@/server/actions/account"

/**
 * Delete account: a row that opens a confirm dialog. Nothing is sent until the
 * person presses "Delete account" inside it. While the request runs the dialog
 * stays open (the action's default close is cancelled) and both buttons are
 * disabled; a failure shows its message inside the dialog. On success the
 * browser session is cleared and the person lands on the start page.
 */
function DeleteAccount() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onConfirm(event: React.MouseEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await deleteAccountAction({ confirm: true })
      if (!result.ok) {
        if (result.error === "unauthorized") {
          router.replace("/sign-in")
          return
        }
        setError(result.message)
        setPending(false)
        return
      }
      // The session row is gone with the account; this just clears the cookie.
      await authClient.signOut().catch(() => undefined)
      router.replace("/")
      router.refresh()
    } catch {
      setError("Could not delete your account. Check your connection and try again.")
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (!pending ? setOpen(next) : undefined)}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-1.5 px-5 py-4 text-caption text-statusError outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
        >
          <Trash aria-hidden="true" className="size-5 shrink-0" />
          Delete account
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your profile, posts, replies, uploaded pictures and job applications, and
            signs you out everywhere. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-body-sm text-statusError">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep my account</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting…" : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteAccount }
