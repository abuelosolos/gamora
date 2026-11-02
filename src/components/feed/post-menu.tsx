"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useFollow } from "@/components/feed/use-follow"
import { DotsThreeVertical, Trash, User, UserFill } from "@/components/icons"
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
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/toast"
import { deletePostAction } from "@/server/actions/posts"

export interface PostMenuProps {
  postId: string
  /** The author's username, for the Follow item. */
  username: string
  /** True when the viewer wrote the post: the menu offers Delete instead of Follow. */
  isOwner: boolean
  /** Whether the viewer already follows the author. */
  following: boolean
  /** Called after the post is deleted (the feed list removes the card). */
  onDeleted?: () => void
  /** Where to go after deleting, for the post page where the card disappears. */
  redirectTo?: string
}

/**
 * The three-dot menu. Figma "Post Interaction Popup": the author sees Delete,
 * everyone else sees Follow. The server checks both again.
 */
function PostMenu({ postId, username, isOwner, following, onDeleted, redirectTo }: PostMenuProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirming, setConfirming] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const { following: isFollowing, toggle: toggleFollow } = useFollow(username, following)

  function confirmDelete(event: React.MouseEvent) {
    // Keep the dialog open until the server answers.
    event.preventDefault()
    startTransition(async () => {
      const result = await deletePostAction(postId)
      if (!result.ok) {
        setConfirming(false)
        toast({ variant: "error", title: result.message })
        return
      }
      setConfirming(false)
      toast({ variant: "success", title: "Post deleted" })
      onDeleted?.()
      if (redirectTo) router.replace(redirectTo)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Post options" className="-mr-2.5">
            <DotsThreeVertical aria-hidden="true" className="size-6 text-textSecondary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner ? (
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 px-3 text-body-sm"
              onSelect={() => setConfirming(true)}
            >
              <Trash aria-hidden="true" />
              Delete post
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="min-h-11 px-3 text-body-sm" onSelect={() => void toggleFollow()}>
              {isFollowing ? <UserFill aria-hidden="true" /> : <User aria-hidden="true" />}
              {isFollowing ? "Unfollow" : "Follow"} @{username}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isOwner ? (
        <AlertDialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                The post and its images will be removed for good. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Keep post</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={pending} onClick={confirmDelete}>
                {pending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}

export { PostMenu }
