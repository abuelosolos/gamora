"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CaretLeft, CheckCircle, SealCheck } from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { chipVariants } from "@/components/ui/chip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { applyToJobAction } from "@/server/actions/jobs"
import type { PortfolioPiece } from "@/server/services/jobs"
import { APPLY_MAX_PIECES, APPLY_MESSAGE_MAX } from "@/server/validators/jobs"

/**
 * The apply screen (a page, not a popup). Figma: Jobs(Post) (74:1978) gave the
 * content and Jobs(Popup) (89:1354) the confirmation.
 *
 * Top bar: back to the job on the left, an accent "Submit" pill on the right
 * (grey until a work is picked). Then "Only the employer can see this", a note
 * field and a sideways row of work tiles. The design's "upload images/videos"
 * row and its camera, video and link icons are replaced by picking from the
 * artist's own posts (up to 4); nothing is uploaded here.
 *
 * Popup: SealCheck in statusSuccess, title, line of text and one button. The
 * design's "You'll be notified when the hirer makes a decision" is not true
 * yet (no hirer side, no notifications for applications), so the line says the
 * application is saved. "Continue Applying" goes back to the wall.
 */
export interface ApplyFormProps {
  jobId: string
  jobTitle: string
  pieces: PortfolioPiece[]
}

function ApplyForm({ jobId, jobTitle, pieces }: ApplyFormProps) {
  const router = useRouter()
  const [done, setDone] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [error, setError] = React.useState("")
  const [pending, startTransition] = React.useTransition()

  function toggle(postId: string) {
    setError("")
    setSelected((current) => {
      if (current.includes(postId)) return current.filter((id) => id !== postId)
      return current.length >= APPLY_MAX_PIECES ? current : [...current, postId]
    })
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (selected.length === 0) {
      setError("Pick at least one of your works.")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await applyToJobAction({ jobId, message, postIds: selected })
      if (result.ok) {
        setDone(true)
        return
      }
      setError(result.message)
      // Someone applied from another tab: show the page as it is now.
      if (result.error === "already_applied") router.refresh()
    })
  }

  const canSubmit = selected.length > 0 && !pending

  return (
    <>
      <TopBar
        hideOnScroll={false}
        leading={
          <TopBarButton label="Back to the job" asChild>
            <Link href={`/jobs/${jobId}`}>
              <CaretLeft aria-hidden="true" className="size-6" />
            </Link>
          </TopBarButton>
        }
        title="Apply"
        trailing={
          // Figma Pills: 28px accent pill; grey until a work is picked.
          <button
            type="submit"
            form="apply-form"
            disabled={!canSubmit}
            className={chipVariants({ variant: "selected", className: "disabled:border-bgSurface disabled:bg-bgSurface" })}
          >
            {pending ? "Sending" : "Submit"}
          </button>
        }
      />

      <div className="flex flex-col gap-1 px-5 pt-2">
        <h2 className="text-body-sm text-textSecondary">{jobTitle}</h2>
      </div>

        <form id="apply-form" onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-4 pt-4 pb-6">
          <p className="px-5 text-caption text-textSecondary">Only the employer can see this</p>

          <div className="flex flex-col gap-1.5 px-5">
            <label htmlFor="apply-message" className="text-body-sm font-medium text-textPrimary">
              Note for the employer (optional)
            </label>
            <Textarea
              id="apply-message"
              value={message}
              maxLength={APPLY_MESSAGE_MAX}
              rows={3}
              placeholder="Say hello and what you would bring to this job"
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="flex w-full items-baseline justify-between px-5 text-body-sm font-medium text-textPrimary">
              Your works
              <span className="text-caption font-normal text-textSecondary" aria-live="polite">
                {selected.length} of {APPLY_MAX_PIECES} picked
              </span>
            </legend>

            {pieces.length === 0 ? (
              <div className="mx-5 flex flex-col items-start gap-3 rounded-ui-md border border-borderDefault bg-bgSurface p-4">
                <p className="text-body-sm text-textSecondary">
                  You have not posted any work with an image yet. Post something first, then come back to apply.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/create">Post a work</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain px-5 pb-1 scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pieces.map((piece) => {
                  const on = selected.includes(piece.postId)
                  const full = !on && selected.length >= APPLY_MAX_PIECES
                  return (
                    <li key={piece.postId} className="shrink-0 snap-start">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={piece.label}
                        disabled={full}
                        onClick={() => toggle(piece.postId)}
                        className={cn(
                          "relative block h-49 w-37.5 overflow-hidden rounded-ui-md border bg-bgSurface outline-none focus-visible:ring-2 focus-visible:ring-accentDefault disabled:opacity-50",
                          on ? "border-accentDefault ring-2 ring-accentDefault" : "border-borderStrong"
                        )}
                      >
                        <Image src={piece.imageUrl} alt="" fill sizes="150px" className="object-cover" />
                        {on ? (
                          <CheckCircle
                            aria-hidden="true"
                            className="absolute top-2 right-2 size-6 rounded-full bg-bgDefault text-accentDefault"
                          />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </fieldset>

          {error ? (
            <p role="alert" className="px-5 text-body-sm text-statusError">
              {error}
            </p>
          ) : null}
        </form>

      <Dialog open={done} onOpenChange={setDone}>
        <DialogContent showCloseButton={false} className="items-center text-center">
          <SealCheck aria-hidden="true" className="mx-auto size-18 text-statusSuccess" />
          <DialogHeader className="items-center gap-1.5">
            <DialogTitle>Application submitted!</DialogTitle>
            <DialogDescription>Your application has been saved with the works you picked.</DialogDescription>
          </DialogHeader>
          <Button
            fullWidth
            onClick={() => {
              setDone(false)
              router.push("/jobs")
              router.refresh()
            }}
          >
            Continue Applying
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ApplyForm }
