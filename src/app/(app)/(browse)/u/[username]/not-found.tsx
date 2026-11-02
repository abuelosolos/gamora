import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function ProfileNotFound() {
  return (
    <main className="flex flex-1 flex-col justify-center">
      <EmptyState
        title="We could not find that artist"
        description="The username may have changed, or the account does not exist."
        action={
          <Button asChild>
            <Link href="/feed">Back to the feed</Link>
          </Button>
        }
      />
    </main>
  )
}
