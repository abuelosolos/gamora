import Link from "next/link"
import { chipVariants } from "@/components/ui/chip"
import { JOB_TYPE_LABELS } from "@/lib/format-job"
import { cn } from "@/lib/utils"
import { JOB_TYPES, type JobTypeValue } from "@/server/validators/jobs"

/**
 * Figma: the Pills row under the Jobs title (All + three outline pills). The
 * design reuses Activity's labels (Likes, Mentions, Replies); here the pills
 * filter by job type. Links, not buttons, so the filter is in the URL.
 */
function JobFilters({ active }: { active: JobTypeValue | undefined }) {
  const items = [{ href: "/jobs", label: "All", selected: !active }].concat(
    JOB_TYPES.map((type) => ({ href: `/jobs?type=${type}`, label: JOB_TYPE_LABELS[type], selected: active === type }))
  )

  return (
    <nav aria-label="Job type" className="border-b border-borderDefault">
      <ul className="flex gap-3.5 overflow-x-auto px-5 py-2.5">
        {items.map(({ href, label, selected }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={selected ? "page" : undefined}
              className={cn(chipVariants({ variant: selected ? "selected" : "outline" }))}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export { JobFilters }
