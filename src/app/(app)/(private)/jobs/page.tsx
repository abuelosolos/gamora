import { Suspense } from "react"
import Link from "next/link"
import { JobCard, JobCardSkeleton } from "@/components/jobs/job-card"
import { JobFilters } from "@/components/jobs/job-filters"
import { TopNavbar } from "@/components/layout/top-navbar"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { JOB_TYPE_LABELS } from "@/lib/format-job"
import { listJobs } from "@/server/services/jobs"
import { jobFilterSchema } from "@/server/validators/jobs"

// Private: the (private) layout requires a session and a profile. Jobs are
// seeded samples; every card says so. Figma: Jobs (55:1139). The filter lives
// in the URL (?type=), so it is read inside Suspense with the rest of the request data.
export const metadata = { title: "Jobs" }

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading jobs" className="flex flex-col gap-2.5 px-5 py-4">
      <JobCardSkeleton />
      <JobCardSkeleton />
      <JobCardSkeleton />
    </div>
  )
}

export default function JobsPage({ searchParams }: PageProps<"/jobs">) {
  return (
    <main className="flex flex-1 flex-col">
      <TopNavbar variant="jobs" />
      <Suspense
        fallback={
          <>
            <div className="h-12 border-b border-borderDefault" aria-hidden="true" />
            <ListSkeleton />
          </>
        }
      >
        <JobsContent searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function JobsContent({ searchParams }: { searchParams: PageProps<"/jobs">["searchParams"] }) {
  const { type: rawType } = await searchParams
  const type = jobFilterSchema.parse(Array.isArray(rawType) ? rawType[0] : rawType)
  const jobs = await listJobs(type)

  return (
    <>
      <JobFilters active={type} />
      {jobs.length === 0 ? (
        <EmptyState
          title={type ? `No ${JOB_TYPE_LABELS[type].toLowerCase()} jobs right now` : "No jobs yet"}
          description={type ? "Try another job type." : "Sample jobs will show up here once they are added."}
          action={
            type ? (
              <Button asChild variant="outline">
                <Link href="/jobs">See all jobs</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5 px-5 py-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
