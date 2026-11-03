import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CaretLeft } from "@/components/icons"
import { ApplyForm } from "@/components/jobs/apply-form"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/server/auth/session"
import { getJob, listPortfolioPieces } from "@/server/services/jobs"
import { jobIdSchema } from "@/server/validators/jobs"

// Private. The apply screen: note for the employer and the works to send.
export const metadata = { title: "Apply" }

export default function ApplyPage({ params }: PageProps<"/jobs/[id]/apply">) {
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <Suspense fallback={<ApplyFallback />}>
        <ApplyContent params={params} />
      </Suspense>
    </main>
  )
}

async function ApplyContent({ params }: { params: PageProps<"/jobs/[id]/apply">["params"] }) {
  const { id } = await params
  const parsed = jobIdSchema.safeParse(id)
  if (!parsed.success) notFound()

  const user = await requireUser()
  const [job, pieces] = await Promise.all([getJob(parsed.data, user.id), listPortfolioPieces(user.id)])
  if (!job) notFound()
  // Already applied: nothing to fill in, go back to the job (it shows "You applied").
  if (job.applied) redirect(`/jobs/${job.id}`)

  return <ApplyForm jobId={job.id} jobTitle={job.title} pieces={pieces} />
}

function ApplyFallback() {
  return (
    <>
      <TopBar
        title="Apply"
        leading={
          <TopBarButton label="Back to jobs" asChild>
            <Link href="/jobs">
              <CaretLeft aria-hidden="true" className="size-6" />
            </Link>
          </TopBarButton>
        }
      />
      <div role="status" aria-label="Loading" className="flex flex-col gap-4 px-5 pt-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-49 w-37.5" />
      </div>
    </>
  )
}
