import type { JobTypeValue } from "@/server/validators/jobs"

/** Wall filter chips, in the order they appear. */
export const JOB_TYPE_LABELS: Record<JobTypeValue, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  freelance: "Freelance",
}

/** "Full time • $200 Per Cover" (Figma Job Card, bottom line). */
export function formatJobTerms(job: { jobType: JobTypeValue; payAmount: number; payUnit: string }): string {
  return `${JOB_TYPE_LABELS[job.jobType]} • $${job.payAmount.toLocaleString("en-US")} Per ${job.payUnit}`
}
