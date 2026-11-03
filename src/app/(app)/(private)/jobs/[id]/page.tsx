import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CaretLeft } from "@/components/icons"
import { JobDetailSkeleton, JobDetailView } from "@/components/jobs/job-detail"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { requireUser } from "@/server/auth/session"
import { getJob } from "@/server/services/jobs"
import { jobIdSchema } from "@/server/validators/jobs"

// Private. No Figma frame: see JobDetailView. Apply is a sheet on this page
// (Figma Jobs(Post)) and the confirmation popup (Figma Jobs(Popup)).
export const metadata = { title: "Job" }

export default function JobPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar
        leading={
          <TopBarButton label="Back to jobs" asChild>
            <Link href="/jobs">
              <CaretLeft aria-hidden="true" className="size-6" />
            </Link>
          </TopBarButton>
        }
      />
      <Suspense fallback={<JobDetailSkeleton />}>
        <JobContent params={params} />
      </Suspense>
    </main>
  )
}

async function JobContent({ params }: { params: PageProps<"/jobs/[id]">["params"] }) {
  const { id } = await params
  const parsed = jobIdSchema.safeParse(id)
  if (!parsed.success) notFound()

  const user = await requireUser()
  const job = await getJob(parsed.data, user.id)
  if (!job) notFound()

  return <JobDetailView job={job} />
}
