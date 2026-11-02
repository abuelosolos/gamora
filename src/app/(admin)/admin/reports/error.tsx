"use client"

import { useEffect } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

/** Reports could not load. The error detail stays in the server log. */
export default function AdminReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin-reports] render failed", error.digest ?? "")
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
      <EmptyState
        title="Reports did not load"
        description="Something went wrong on our side. Check your connection and try again."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  )
}
