"use client"

import * as React from "react"
import Link from "next/link"
import { SealCheck, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { chipVariants } from "@/components/ui/chip"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createReportAction } from "@/server/actions/reports"
import {
  REPORT_DETAILS_MAX,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReasonValue,
  type ReportTarget,
} from "@/server/validators/reports"

/**
 * Report sheet for a post, a reply or a profile. There is no Figma frame for it
 * (the design only has a "Report" menu item), so it follows the apply sheet:
 * close on the left, an accent "Submit" pill on the right, a radio list of
 * reasons, an optional note, and a short thank-you once it is saved.
 *
 * It is controlled by the menu that opens it, and rendered outside the dropdown
 * so closing the menu does not close the sheet. The reporter's identity comes
 * from the session on the server; nothing here is trusted.
 */
export interface ReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ReportTarget
  /** "post", "reply" or "profile": only used for the wording. */
  noun: "post" | "reply" | "profile"
}

function ReportSheet({ open, onOpenChange, target, noun }: ReportSheetProps) {
  const [reason, setReason] = React.useState<ReportReasonValue | null>(null)
  const [details, setDetails] = React.useState("")
  const [error, setError] = React.useState("")
  const [needsSignIn, setNeedsSignIn] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      // Start fresh next time, once the sheet has slid away.
      window.setTimeout(() => {
        setReason(null)
        setDetails("")
        setError("")
        setNeedsSignIn(false)
        setDone(false)
      }, 300)
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!reason) {
      setError("Pick a reason.")
      return
    }
    setError("")
    setNeedsSignIn(false)
    startTransition(async () => {
      const result = await createReportAction({ target, reason, details })
      if (result.ok) {
        setDone(true)
        return
      }
      if (result.error === "unauthorized") setNeedsSignIn(true)
      setError(result.message)
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="max-h-[90dvh]">
        <div className="flex items-center justify-between px-5 pt-1">
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close" className="-ml-2.5">
              <X aria-hidden="true" className="size-6" />
            </Button>
          </SheetClose>
          {done ? null : (
            <button
              type="submit"
              form="report-form"
              disabled={!reason || pending}
              className={chipVariants({ variant: "selected", className: "disabled:border-bgSurface disabled:bg-bgSurface" })}
            >
              {pending ? "Sending" : "Submit"}
            </button>
          )}
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-5 pt-4 pb-6 text-center">
            <SealCheck aria-hidden="true" className="size-18 text-statusSuccess" />
            <SheetTitle>Thanks for letting us know</SheetTitle>
            <SheetDescription>We will review this {noun}. The person who made it is not told who reported it.</SheetDescription>
            <Button fullWidth onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 px-5 pt-2">
              <SheetTitle>Report this {noun}</SheetTitle>
              <SheetDescription>Only our team sees your report.</SheetDescription>
            </div>

            <form id="report-form" onSubmit={submit} className="flex flex-col gap-4 overflow-y-auto pt-4 pb-4">
              <fieldset className="flex flex-col gap-1 border-0 px-5 py-0">
                <legend className="pb-1 text-body-sm font-medium text-textPrimary">Why are you reporting it?</legend>
                {REPORT_REASONS.map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-ui-sm border px-3 text-body-sm text-textPrimary has-focus-visible:ring-2 has-focus-visible:ring-accentDefault",
                      reason === value ? "border-accentDefault bg-accentSubtle" : "border-borderDefault hover:bg-bgSurface"
                    )}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={reason === value}
                      onChange={() => {
                        setReason(value)
                        setError("")
                      }}
                      className="size-4 accent-accentDefault"
                    />
                    {REPORT_REASON_LABELS[value]}
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-col gap-1.5 px-5">
                <label htmlFor="report-details" className="text-body-sm font-medium text-textPrimary">
                  More details (optional)
                </label>
                <Textarea
                  id="report-details"
                  value={details}
                  maxLength={REPORT_DETAILS_MAX}
                  rows={3}
                  placeholder="Anything that helps us understand"
                  onChange={(event) => setDetails(event.target.value)}
                />
              </div>

              {error ? (
                <p role="alert" className="px-5 text-body-sm text-statusError">
                  {error}{" "}
                  {needsSignIn ? (
                    <Link href="/sign-in" className="underline">
                      Sign in
                    </Link>
                  ) : null}
                </p>
              ) : null}
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export { ReportSheet }
