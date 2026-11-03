import "server-only"
import { randomUUID } from "node:crypto"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/server/db"
import { jobApplicationPosts, jobApplications, jobs, postImages, posts } from "@/server/db/schema"
import { isUniqueViolation } from "@/server/services/profile"
import type { JobMediumValue, JobTypeValue } from "@/server/validators/jobs"

/** What a page may show about a job. Poster is a name only (there are no hirer accounts). */
export interface JobView {
  id: string
  title: string
  summary: string
  posterName: string
  jobType: JobTypeValue
  payAmount: number
  payUnit: string
  /** Seeded sample data. The UI labels every sample job as one. */
  isSample: boolean
  createdAt: string
}

export interface JobDetail extends JobView {
  description: string
  category: string
  medium: JobMediumValue
  artStyles: string[]
  deliverables: string[]
  requirements: string[]
  timeline: string
  /** True when the signed-in viewer already applied. Decided here, never by the client. */
  applied: boolean
}

const jobColumns = {
  id: jobs.id,
  title: jobs.title,
  summary: jobs.summary,
  posterName: jobs.posterName,
  jobType: jobs.jobType,
  payAmount: jobs.payAmount,
  payUnit: jobs.payUnit,
  isSample: jobs.isSample,
  createdAt: jobs.createdAt,
}

const WALL_LIMIT = 50

function toView(row: Omit<JobView, "createdAt"> & { createdAt: Date }): JobView {
  return { ...row, createdAt: row.createdAt.toISOString() }
}

/** The wall, newest first, optionally one type (jobs_type_idx / jobs_created_at_idx). */
export async function listJobs(type: JobTypeValue | undefined): Promise<JobView[]> {
  const rows = await db
    .select(jobColumns)
    .from(jobs)
    .where(type ? eq(jobs.jobType, type) : undefined)
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(WALL_LIMIT)
  return rows.map(toView)
}

export async function getJob(id: string, viewerId: string): Promise<JobDetail | null> {
  const [row] = await db
    .select({
      ...jobColumns,
      description: jobs.description,
      category: jobs.category,
      medium: jobs.medium,
      artStyles: jobs.artStyles,
      deliverables: jobs.deliverables,
      requirements: jobs.requirements,
      timeline: jobs.timeline,
    })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)
  if (!row) return null

  const [existing] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, id), eq(jobApplications.applicantId, viewerId)))
    .limit(1)

  return { ...toView(row), ...row, createdAt: row.createdAt.toISOString(), applied: Boolean(existing) }
}

/** A work the artist can attach: one of their own posts that has at least one image. */
export interface PortfolioPiece {
  postId: string
  imageUrl: string
  width: number
  height: number
  label: string
}

const PIECES_LIMIT = 40

/** The viewer's own top-level posts with images, newest first. Never anyone else's. */
export async function listPortfolioPieces(userId: string): Promise<PortfolioPiece[]> {
  const rows = await db
    .select({
      postId: posts.id,
      body: posts.body,
      imageUrl: postImages.url,
      width: postImages.width,
      height: postImages.height,
    })
    .from(posts)
    // position 0 is the cover image of the post.
    .innerJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .where(and(eq(posts.authorId, userId), isNull(posts.parentId)))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(PIECES_LIMIT)

  return rows.map((row) => ({
    postId: row.postId,
    imageUrl: row.imageUrl,
    width: row.width,
    height: row.height,
    label: row.body.trim().slice(0, 80) || "Untitled work",
  }))
}

export type ApplyOutcome = { ok: true } | { ok: false; reason: "job_not_found" | "bad_pieces" | "already_applied" }

/**
 * Saves an application. `userId` comes from the session. Ownership is checked
 * here, in the queries: every picked post must be the applicant's own top-level
 * post with an image, otherwise nothing is written. The application and its
 * pieces go in one atomic batch; the unique index on (job, applicant) turns a
 * double submit into "already applied".
 */
export async function createApplication(params: {
  userId: string
  jobId: string
  message: string
  postIds: string[]
}): Promise<ApplyOutcome> {
  const { userId, jobId, message, postIds } = params

  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1)
  if (!job) return { ok: false, reason: "job_not_found" }

  const owned = await db
    .select({ id: posts.id })
    .from(posts)
    .innerJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .where(and(inArray(posts.id, postIds), eq(posts.authorId, userId), isNull(posts.parentId)))
  if (owned.length !== postIds.length) return { ok: false, reason: "bad_pieces" }

  const [existing] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, userId)))
    .limit(1)
  if (existing) return { ok: false, reason: "already_applied" }

  const applicationId = randomUUID()
  try {
    await db.batch([
      db.insert(jobApplications).values({ id: applicationId, jobId, applicantId: userId, message }),
      db
        .insert(jobApplicationPosts)
        .values(postIds.map((postId, position) => ({ applicationId, postId, position }))),
    ])
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "already_applied" }
    throw error
  }
  return { ok: true }
}
