import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function JobNotFound() {
  return (
    <main className="flex flex-1 flex-col justify-center">
      <EmptyState
        title="We could not find that job"
        description="It may have been removed, or the link is wrong."
        action={
          <Button asChild>
            <Link href="/jobs">Back to jobs</Link>
          </Button>
        }
      />
    </main>
  )
}
