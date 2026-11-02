import type { ReportRow } from "@/server/services/admin-reports"

export const TARGET_LABELS: Record<ReportRow["targetType"], string> = {
  post: "Post",
  reply: "Reply",
  profile: "Profile",
}

export const STATUS_LABELS: Record<ReportRow["status"], string> = {
  open: "Open",
  dismissed: "Dismissed",
  content_removed: "Content removed",
}

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })

/** Admin pages show UTC so two admins read the same time. */
export function formatAdminTime(date: Date): string {
  return `${dateTime.format(date)} UTC`
}
