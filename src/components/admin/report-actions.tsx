"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { dismissReportAction, removeContentAction } from "@/server/actions/admin-reports"

/**
 * The two things an admin can do with an open report. Dismiss runs straight
 * away. Removing content asks first, because it cannot be undone. Both actions
 * check the admin flag again on the server; hiding the buttons from non-admins
 * is not what protects them (the layout and the actions are).
 */
function ReportActions({
  reportId,
  contentKind,
  contentGone,
}: {
  reportId: string
  contentKind: "post" | "reply" | "profile"
  contentGone: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)

  function run(action: typeof dismissReportAction) {
    setError("")
    startTransition(async () => {
      const result = await action(reportId)
      if (result.ok) {
        setConfirming(false)
        router.replace("/admin/reports")
        router.refresh()
        return
      }
      setConfirming(false)
      setError(result.message)
      // Already handled elsewhere: show the page as it is now.
      if (result.error === "not_open") router.refresh()
    })
  }

  const removeLabel = contentKind === "profile" ? "Clear bio and picture" : `Delete ${contentKind}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" disabled={pending} onClick={() => run(dismissReportAction)}>
          Dismiss report
        </Button>

        <AlertDialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              {contentGone ? "Mark as removed" : removeLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{contentGone ? "Mark this report as removed?" : `${removeLabel}?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {contentGone
                  ? "The content is already gone. This closes the report."
                  : contentKind === "profile"
                    ? "The profile's bio and picture are removed for good and every open report on this profile is closed. The account stays."
                    : "It and its images are removed for good, and every open report on it is closed. This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault()
                  run(removeContentAction)
                }}
              >
                {pending ? "Working…" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-statusError">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { ReportActions }
