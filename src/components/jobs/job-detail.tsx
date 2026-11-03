import Link from "next/link"
import { JobShareButton } from "@/components/jobs/job-share-button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { JOB_MEDIUM_LABELS, formatJobTerms } from "@/lib/format-job"
import type { JobDetail } from "@/server/services/jobs"

/**
 * No Figma frame exists for the job page. It is the Job Card's content
 * (avatar, title, poster, terms, share) with the full description below and a
 * single Apply button, built from existing tokens and components.
 */
function JobDetailView({ job }: { job: JobDetail }) {
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

      <dl className="grid grid-cols-2 gap-3 rounded-ui-md border border-borderDefault bg-bgSurface p-4">
        {job.category ? <Fact label="Category" value={job.category} /> : null}
        <Fact label="Artist needed" value={JOB_MEDIUM_LABELS[job.medium]} />
        {job.timeline ? <Fact label="Timeline" value={job.timeline} wide /> : null}
      </dl>

      {job.artStyles.length > 0 ? (
        <section aria-labelledby="job-styles" className="flex flex-col gap-2">
          <h2 id="job-styles" className="text-body-sm font-medium text-textPrimary">
            Art style
          </h2>
          <ul className="flex flex-wrap gap-2">
            {job.artStyles.map((style) => (
              <li key={style}>
                <Badge variant="accent">{style}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="job-about" className="flex flex-col gap-2">
        <h2 id="job-about" className="text-body-sm font-medium text-textPrimary">
          About the job
        </h2>
        <p className="text-body-sm wrap-break-word whitespace-pre-wrap text-textSecondary">{job.description}</p>
      </section>

      <BulletSection id="job-deliverables" title="What you will deliver" items={job.deliverables} />
      <BulletSection id="job-requirements" title="What we are looking for" items={job.requirements} />

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
          <Button asChild fullWidth>
            <Link href={`/jobs/${job.id}/apply`}>Apply</Link>
          </Button>
        )}
      </div>
    </article>
  )
}

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex flex-col gap-0.5" : "flex flex-col gap-0.5"}>
      <dt className="text-caption text-textSecondary">{label}</dt>
      <dd className="text-body-sm font-medium wrap-break-word text-textPrimary">{value}</dd>
    </div>
  )
}

function BulletSection({ id, title, items }: { id: string; title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-body-sm font-medium text-textPrimary">
        {title}
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-textSecondary marker:text-textSecondary">
        {items.map((item) => (
          <li key={item} className="wrap-break-word">
            {item}
          </li>
        ))}
      </ul>
    </section>
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
