import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ReportActions } from "@/components/admin/report-actions"
import { STATUS_LABELS, TARGET_LABELS, formatAdminTime } from "@/components/admin/report-labels"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getReportDetail } from "@/server/services/admin-reports"
import { REPORT_REASON_LABELS, reportIdSchema } from "@/server/validators/reports"

// Admin only (see the (admin) layout). The reporter's identity is never shown.
export const metadata = { title: "Report" }

export default function AdminReportPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <Link href="/admin/reports" className="text-body-sm text-accentDefault underline-offset-4 hover:underline">
        ← All reports
      </Link>
      <Suspense fallback={<ReportFallback />}>
        <ReportBody params={params} />
      </Suspense>
    </main>
  )
}

async function ReportBody({ params }: { params: Promise<{ id: string }> }) {
  const parsed = reportIdSchema.safeParse((await params).id)
  if (!parsed.success) notFound()
  const report = await getReportDetail(parsed.data)
  if (!report) notFound()
  const { content } = report

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-title-m font-semibold text-textPrimary">
            {TARGET_LABELS[report.targetType]} report
          </h1>
          <Badge variant={report.status === "open" ? "warning" : "neutral"}>{STATUS_LABELS[report.status]}</Badge>
        </div>
        <p className="text-body-sm text-textSecondary">
          {REPORT_REASON_LABELS[report.reason]} · {formatAdminTime(report.createdAt)}
        </p>
        {report.details ? (
          <p className="rounded-ui-md border border-borderDefault bg-bgSurface p-3 text-body-sm wrap-break-word whitespace-pre-wrap text-textPrimary">
            {report.details}
          </p>
        ) : (
          <p className="text-body-sm text-textSecondary">No extra details.</p>
        )}
      </header>

      <section aria-labelledby="content-heading" className="flex flex-col gap-3">
        <h2 id="content-heading" className="text-body font-medium text-textPrimary">
          Reported content
        </h2>
        {!content ? (
          <p className="rounded-ui-md border border-borderDefault bg-bgSurface p-4 text-body-sm text-textSecondary">
            This content no longer exists. It was deleted by its author or already removed.
          </p>
        ) : content.kind === "profile" ? (
          <div className="flex flex-col gap-3 rounded-ui-md border border-borderDefault p-4">
            <div className="flex items-center gap-3">
              <Avatar src={content.avatarUrl} name={content.name} size="lg" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium text-textPrimary">{content.name}</span>
                <Link href={`/u/${content.username}`} className="truncate text-body-sm text-accentDefault hover:underline">
                  @{content.username}
                </Link>
              </div>
            </div>
            <p className="text-body-sm wrap-break-word whitespace-pre-wrap text-textPrimary">
              {content.bio || <span className="text-textSecondary">No bio.</span>}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-ui-md border border-borderDefault p-4">
            <Link href={`/u/${content.author.username}`} className="text-body-sm text-accentDefault hover:underline">
              {content.author.name} · @{content.author.username}
            </Link>
            {content.body ? (
              <p className="text-body-sm wrap-break-word whitespace-pre-wrap text-textPrimary">{content.body}</p>
            ) : null}
            {content.images.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2">
                {content.images.map((image) => (
                  <li key={image.url} className="relative aspect-square overflow-hidden rounded-ui-sm border border-borderStrong bg-bgSurface">
                    <Image src={image.url} alt={image.altText || "Reported image"} fill sizes="320px" className="object-cover" />
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href={`/post/${content.id}`} className="text-body-sm text-accentDefault hover:underline">
              Open in the app
            </Link>
          </div>
        )}
      </section>

      {report.status === "open" ? (
        <ReportActions
          reportId={report.id}
          contentKind={report.targetType}
          contentGone={content === null}
        />
      ) : (
        <p className="text-body-sm text-textSecondary">
          {STATUS_LABELS[report.status]}
          {report.resolvedAt ? ` · ${formatAdminTime(report.resolvedAt)}` : ""}
        </p>
      )}
    </>
  )
}

function ReportFallback() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
