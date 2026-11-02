import { ApplySheet } from "@/components/jobs/apply-sheet"
import { JobShareButton } from "@/components/jobs/job-share-button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatJobTerms } from "@/lib/format-job"
import type { JobDetail, PortfolioPiece } from "@/server/services/jobs"

/**
 * No Figma frame exists for the job page. It is the Job Card's content
 * (avatar, title, poster, terms, share) with the full description below and a
 * single Apply button, built from existing tokens and components.
 */
function JobDetailView({ job, pieces }: { job: JobDetail; pieces: PortfolioPiece[] }) {
  return (
    <article className="flex flex-1 flex-col gap-4 px-5 pb-6" aria-label={job.title}>
      <div className="flex items-start gap-4">
        <Avatar name={job.posterName} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-display text-title-s font-semibold text-textPrimary">{job.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-caption text-textSecondary">
            {job.posterName}
            {job.isSample ? <Badge>Sample</Badge> : null}
          </p>
        </div>
        <JobShareButton jobId={job.id} title={job.title} className="-mt-1 -mr-2" />
      </div>

      <p className="text-body-sm font-medium text-textPrimary">{formatJobTerms(job)}</p>
      <p className="text-body-sm wrap-break-word whitespace-pre-wrap text-textSecondary">{job.description}</p>

      {job.isSample ? (
        <p className="rounded-ui-md border border-borderDefault bg-bgSurface p-3 text-caption text-textSecondary">
          This is a sample job made up for the demo. Applying saves your application, but no real hirer sees it.
        </p>
      ) : null}

      <div className="mt-auto pt-2">
        {job.applied ? (
          <Button fullWidth disabled>
            You applied
          </Button>
        ) : (
          <ApplySheet jobId={job.id} jobTitle={job.title} pieces={pieces} />
        )}
      </div>
    </article>
  )
}

function JobDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading job" className="flex flex-col gap-4 px-5">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export { JobDetailView, JobDetailSkeleton }
