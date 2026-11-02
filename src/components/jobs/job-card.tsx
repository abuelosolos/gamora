import Link from "next/link"
import { JobShareButton } from "@/components/jobs/job-share-button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatJobTerms } from "@/lib/format-job"
import type { JobView } from "@/server/services/jobs"

/**
 * Figma: Job Card (59:1874). Poster avatar, title, poster name, summary, then
 * "Full time • $200 Per Cover" with share on the right.
 *
 * Deviations from the design:
 *  - The bookmark icon is left out: saving jobs is not part of this phase.
 *  - The poster avatar is the initials fallback (sample posters have no
 *    picture), and every sample job carries a "Sample" label.
 *  - The drop shadow is a 1px borderDefault line (no raw shadow values).
 *  - The whole card opens the job through a stretched link on the title; the
 *    share button sits above it.
 */
function JobCard({ job }: { job: JobView }) {
  return (
    <article
      data-slot="job-card"
      aria-label={job.title}
      className="relative flex flex-col gap-2 rounded-ui-md border border-borderDefault bg-bgSurface p-5"
    >
      <div className="flex items-start gap-4">
        <Avatar name={job.posterName} size="md" />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-body font-medium text-textPrimary">
            <Link
              href={`/jobs/${job.id}`}
              className="rounded-ui-sm outline-none after:absolute after:inset-0 after:rounded-ui-md focus-visible:after:ring-2 focus-visible:after:ring-accentDefault"
            >
              {job.title}
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-caption text-textSecondary">
            {job.posterName}
            {job.isSample ? <Badge>Sample</Badge> : null}
          </p>
        </div>
      </div>
      <p className="text-body-sm text-textSecondary">{job.summary}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-textSecondary">{formatJobTerms(job)}</p>
        <JobShareButton jobId={job.id} title={job.title} className="relative -my-2 -mr-2" />
      </div>
    </article>
  )
}

/** Loading placeholder with the same layout as a card. */
function JobCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-ui-md border border-borderDefault bg-bgSurface p-5" aria-hidden="true">
      <div className="flex items-start gap-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export { JobCard, JobCardSkeleton }
