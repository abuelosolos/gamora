"use client"

import { useEffect } from "react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

/** The feed could not load. The error detail stays in the server log. */
export default function FeedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[feed] render failed", error.digest ?? "")
  }, [error])

  return (
    <main className="flex flex-1 flex-col justify-center">
      <EmptyState
        title="The feed did not load"
        description="Something went wrong on our side. Check your connection and try again."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  )
}
