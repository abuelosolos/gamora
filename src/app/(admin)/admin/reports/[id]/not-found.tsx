import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function ReportNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
      <EmptyState
        title="Report not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button asChild>
            <Link href="/admin/reports">All reports</Link>
          </Button>
        }
      />
    </main>
  )
}
