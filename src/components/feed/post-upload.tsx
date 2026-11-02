"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { createPostAction } from "@/server/actions/posts"

/**
 * Figma: "Post (Uploading)" and "Post (Uploaded)". Pressing Post closes the
 * composer at once and the feed shows a bar under the top navbar: "Your post is
 * being uploaded" over an accent progress bar, then "Your post was successfully
 * uploaded" over a full statusSuccess bar. The bar slides down from under the
 * navbar and pushes the feed down; it slides back up after a few seconds.
 *
 * The upload runs here, in a provider that lives in the app layout, so it keeps
 * going while the page changes from the composer to the feed. If it fails the
 * bar says so and offers Try again (the text and files are kept until then).
 */
export interface PostUploadInput {
  body: string
  files: File[]
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done" }
  | { status: "error"; message: string }

interface PostUploadContextValue {
  state: UploadState
  start: (input: PostUploadInput) => void
  retry: () => void
  dismiss: () => void
}

const PostUploadContext = React.createContext<PostUploadContextValue | null>(null)

const DONE_VISIBLE_MS = 3500

function PostUploadProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = React.useState<UploadState>({ status: "idle" })
  const lastInput = React.useRef<PostUploadInput | null>(null)
  const running = React.useRef(false)
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
  }
  React.useEffect(() => clearTimer, [])

  const run = React.useCallback(
    async (input: PostUploadInput) => {
      if (running.current) return
      running.current = true
      clearTimer()
      lastInput.current = input
      setState({ status: "uploading", progress: 10 })

      const fail = (message: string) => setState({ status: "error", message })

      try {
        let images: { url: string; width: number; height: number; altText: string }[] = []
        if (input.files.length > 0) {
          const form = new FormData()
          input.files.forEach((file) => form.append("files", file))
          const response = await fetch("/api/upload", { method: "POST", body: form })
          if (response.status === 401) {
            setState({ status: "idle" })
            router.push("/sign-in?next=/create")
            return
          }
          const data = (await response.json().catch(() => null)) as
            | { files?: { url: string; width: number; height: number }[]; message?: string }
            | null
          if (!response.ok || !data?.files) return fail(data?.message ?? "Upload failed.")
          images = data.files.map((file) => ({ ...file, altText: "" }))
        }
        setState({ status: "uploading", progress: 70 })

        const result = await createPostAction({ body: input.body, images })
        if (!result.ok) {
          if (result.error === "unauthorized") {
            setState({ status: "idle" })
            router.push("/sign-in?next=/create")
            return
          }
          return fail(result.message)
        }

        lastInput.current = null
        setState({ status: "done" })
        router.refresh()
        hideTimer.current = setTimeout(() => setState({ status: "idle" }), DONE_VISIBLE_MS)
      } catch {
        fail("Check your connection.")
      } finally {
        running.current = false
      }
    },
    [router]
  )

  const value = React.useMemo<PostUploadContextValue>(
    () => ({
      state,
      start: (input) => void run(input),
      retry: () => {
        if (lastInput.current) void run(lastInput.current)
      },
      dismiss: () => {
        clearTimer()
        lastInput.current = null
        setState({ status: "idle" })
      },
    }),
    [state, run]
  )

  return <PostUploadContext.Provider value={value}>{children}</PostUploadContext.Provider>
}

function usePostUpload() {
  const ctx = React.useContext(PostUploadContext)
  if (!ctx) throw new Error("usePostUpload must be used inside <PostUploadProvider>")
  return ctx
}

/** Put this right under the top navbar on the feed. Renders nothing while idle. */
function PostUploadBanner({ className }: { className?: string }) {
  const { state, retry, dismiss } = usePostUpload()
  const reduceMotion = useReducedMotion()
  const visible = state.status !== "idle"

  const progress = state.status === "uploading" ? state.progress : state.status === "done" ? 100 : 0
  const title =
    state.status === "done"
      ? "Your post was successfully uploaded"
      : state.status === "error"
        ? `Your post could not be uploaded. ${state.message}`
        : "Your post is being uploaded"

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="post-upload"
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.3, ease: "easeOut" }}
          className={cn("overflow-hidden bg-bgDefault", className)}
        >
          <div role={state.status === "error" ? "alert" : "status"} className="flex flex-col gap-1.25 px-5 py-2.5">
            <p
              className={cn(
                "text-caption wrap-break-word",
                state.status === "error" ? "text-statusError" : "text-textPrimary"
              )}
            >
              {title}
            </p>
            {state.status === "error" ? (
              <div className="-mb-2.5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-11 text-caption text-accentDefault outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="min-h-11 text-caption text-textSecondary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div
                role="progressbar"
                aria-label={title}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 w-full overflow-hidden rounded-full bg-borderDefault"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width,background-color] duration-300",
                    state.status === "done" ? "bg-statusSuccess" : "bg-accentDefault"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export { PostUploadBanner, PostUploadProvider, usePostUpload }
