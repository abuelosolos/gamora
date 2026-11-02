import { Suspense } from "react"
import Link from "next/link"
import { STATUS_LABELS, TARGET_LABELS, formatAdminTime } from "@/components/admin/report-labels"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { chipVariants } from "@/components/ui/chip"
import { Skeleton } from "@/components/ui/skeleton"
import { listReports } from "@/server/services/admin-reports"
import { REPORT_REASON_LABELS, reportQueueSchema } from "@/server/validators/reports"

// Admin only: the (admin) layout calls requireAdmin, and every admin action
// checks the flag again. The queue filter comes from the URL and is validated.
export const metadata = { title: "Reports" }

export default function AdminReportsPage({ searchParams }: { searchParams: Promise<{ queue?: string | string[] }> }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 py-6">
      <h1 className="text-title-m font-semibold text-textPrimary">Reports</h1>
      <Suspense fallback={<QueueFallback />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Queue({ searchParams }: { searchParams: Promise<{ queue?: string | string[] }> }) {
  const { queue: raw } = await searchParams
  const queue = reportQueueSchema.parse(Array.isArray(raw) ? raw[0] : raw)
  const rows = await listReports(queue)

  return (
    <>
      <nav aria-label="Report queue" className="flex gap-2">
        {(["open", "resolved"] as const).map((value) => (
          <Link
            key={value}
            href={`/admin/reports?queue=${value}`}
            aria-current={queue === value ? "page" : undefined}
            className={chipVariants({ variant: queue === value ? "selected" : "outline" })}
          >
            {value === "open" ? "Open" : "Handled"}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title={queue === "open" ? "No open reports" : "Nothing handled yet"}
          description={queue === "open" ? "New reports will show up here." : "Reports you dismiss or act on will show up here."}
        />
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-ui-md border border-borderDefault">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-borderDefault last:border-b-0">
              <Link
                href={`/admin/reports/${row.id}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-none hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-sm font-medium text-textPrimary">
                    {TARGET_LABELS[row.targetType]} · {REPORT_REASON_LABELS[row.reason]}
                  </span>
                  <span className="text-caption text-textSecondary">{formatAdminTime(row.createdAt)}</span>
                </span>
                <Badge variant={row.status === "open" ? "warning" : "neutral"}>{STATUS_LABELS[row.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function QueueFallback() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-11 w-40" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  )
}
