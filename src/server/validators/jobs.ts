import { z } from "zod"

export const JOB_TYPES = ["full_time", "part_time", "contract", "freelance"] as const
export const jobTypeSchema = z.enum(JOB_TYPES)
export type JobTypeValue = z.infer<typeof jobTypeSchema>

/** The wall filter: one job type, or nothing for All. Anything else is ignored. */
export const jobFilterSchema = jobTypeSchema.optional().catch(undefined)

export const JOB_MEDIUMS = ["digital", "traditional", "sculpture", "paper", "mixed"] as const
export type JobMediumValue = (typeof JOB_MEDIUMS)[number]

export const jobIdSchema = z.uuid()

export const APPLY_MAX_PIECES = 4
export const APPLY_MESSAGE_MAX = 1000

/** Same limit as the database check `job_applications_message_length`. */
export const applyToJobSchema = z.strictObject({
  jobId: jobIdSchema,
  message: z.string().trim().max(APPLY_MESSAGE_MAX, `Use ${APPLY_MESSAGE_MAX} characters or fewer.`),
  postIds: z
    .array(z.uuid())
    .min(1, "Pick at least one of your works.")
    .max(APPLY_MAX_PIECES, `Pick up to ${APPLY_MAX_PIECES} works.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each work can only be picked once."),
})

export type ApplyToJobInput = z.input<typeof applyToJobSchema>
