"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ProhibitInset } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
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
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { unblockUsersAction } from "@/server/actions/blocks"
import type { BlockedUserView } from "@/server/services/blocks"

export interface BlockedListProps {
  people: BlockedUserView[]
}

/**
 * The blocked users list. "Select" turns on selection: tap rows to tick them
 * (as many as you like), "Select all" ticks everyone, and "Unblock (n)" opens a
 * confirm dialog. Outside selection mode the rows are plain, since a blocked
 * person's profile is hidden from you anyway.
 */
function BlockedList({ people }: BlockedListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selecting, setSelecting] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [confirming, setConfirming] = React.useState(false)
  // The one person whose sheet is open (tap a row outside Select mode).
  const [single, setSingle] = React.useState<BlockedUserView | null>(null)
  const [pending, startTransition] = React.useTransition()

  // Drop ticks for people who are no longer in the list (after a refresh).
  const usernames = React.useMemo(() => new Set(people.map((person) => person.username)), [people])
  const ticked = React.useMemo(() => [...selected].filter((username) => usernames.has(username)), [selected, usernames])

  if (people.length === 0) {
    return (
      <EmptyState
        icon={<ProhibitInset />}
        title="No blocked users"
        description="People you block will show up here. You can unblock them any time."
      />
    )
  }

  const allTicked = ticked.length === people.length

  function toggle(username: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (on) next.add(username)
      else next.delete(username)
      return next
    })
  }

  function endSelecting() {
    setSelecting(false)
    setSelected(new Set())
  }

  // One code path for the sheet (one person) and the multi-select confirm.
  function runUnblock(names: string[]) {
    startTransition(async () => {
      const result = await unblockUsersAction({ usernames: names })
      setConfirming(false)
      setSingle(null)
      if (!result.ok) {
        toast({ variant: "error", title: result.message })
        return
      }
      toast({ variant: "success", title: names.length === 1 ? "Unblocked" : `Unblocked ${names.length} people` })
      endSelecting()
      router.refresh()
    })
  }

  function confirmUnblock(event: React.MouseEvent) {
    event.preventDefault()
    runUnblock(ticked)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-11 items-center justify-between gap-3 px-5">
        <p className="text-caption text-textSecondary">
          {selecting ? `${ticked.length} selected` : `${people.length} blocked`}
        </p>
        <div className="flex items-center gap-1">
          {selecting ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSelected(allTicked ? new Set() : new Set(people.map((person) => person.username)))}
            >
              {allTicked ? "Clear" : "Select all"}
            </Button>
          ) : null}
          <Button variant="ghost" size="xs" onClick={() => (selecting ? endSelecting() : setSelecting(true))}>
            {selecting ? "Cancel" : "Select"}
          </Button>
        </div>
      </div>

      <ul className="flex flex-1 flex-col pb-6">
        {people.map((person) => {
          const isTicked = selected.has(person.username)
          const content = (
            <>
              <Avatar src={person.avatarUrl} name={person.name} size="md" />
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-body-sm font-medium text-textPrimary">{person.name}</span>
                <span className="truncate text-caption text-textSecondary">@{person.username}</span>
              </span>
            </>
          )
          return (
            <li key={person.username}>
              {selecting ? (
                <label
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors hover:bg-bgSurface",
                    isTicked && "bg-bgSurface"
                  )}
                >
                  {content}
                  <Checkbox
                    checked={isTicked}
                    onCheckedChange={(value) => toggle(person.username, value === true)}
                    aria-label={`Select @${person.username}`}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setSingle(person)}
                  className="flex min-h-14 w-full items-center gap-3 px-5 py-2.5 outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
                >
                  {content}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {selecting ? (
        <div className="sticky bottom-0 mt-auto border-t border-borderDefault bg-bgDefault px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="w-full" disabled={ticked.length === 0 || pending} onClick={() => setConfirming(true)}>
            {ticked.length > 0 ? `Unblock (${ticked.length})` : "Unblock"}
          </Button>
        </div>
      ) : null}

      <Sheet open={single !== null} onOpenChange={(open) => !pending && !open && setSingle(null)}>
        <SheetContent>
          {single ? (
            <>
              <SheetHeader className="items-center text-center">
                <Avatar src={single.avatarUrl} name={single.name} size="lg" />
                <SheetTitle className="max-w-full truncate">{single.name}</SheetTitle>
                <SheetDescription className="max-w-full truncate">@{single.username}</SheetDescription>
              </SheetHeader>
              <p className="px-5 text-center text-body-sm text-textSecondary">
                Unblock them and you will see each other&apos;s posts and profiles again.
              </p>
              <SheetFooter>
                <Button fullWidth loading={pending} onClick={() => runUnblock([single.username])}>
                  Unblock
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ticked.length === 1 ? "Unblock this person?" : `Unblock ${ticked.length} people?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will see each other&apos;s posts and profiles again and can follow each other. Follows removed when you
              blocked them are not restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirmUnblock}>
              {pending ? "Unblocking…" : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { BlockedList }
