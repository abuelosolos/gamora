import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { posts } from "./posts";

/**
 * Sample jobs. There are no hirer accounts yet, so a job is not owned by a
 * user: the poster is just a name. Every row is seeded and flagged `is_sample`
 * so the UI can label it as a sample.
 */
export const jobType = pgEnum("job_type", ["full_time", "part_time", "contract", "freelance"]);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    /** Short line shown on the wall card. */
    summary: text("summary").notNull(),
    /** Longer text shown on the job page. */
    description: text("description").notNull(),
    posterName: text("poster_name").notNull(),
    jobType: jobType("job_type").notNull(),
    /** Whole US dollars, paid per `pay_unit` ("Cover", "Illustration"). */
    payAmount: integer("pay_amount").notNull(),
    payUnit: text("pay_unit").notNull(),
    isSample: boolean("is_sample").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // The wall: newest first, optionally one type.
    index("jobs_created_at_idx").on(table.createdAt.desc(), table.id.desc()),
    index("jobs_type_idx").on(table.jobType, table.createdAt.desc()),
    check("jobs_pay_positive", sql`${table.payAmount} > 0`),
    check("jobs_title_length", sql`char_length(${table.title}) <= 120`),
  ],
);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Optional note to the hirer. Only the applicant (and later the hirer) may read it. */
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // One application per artist per job. Also makes a double tap harmless.
    uniqueIndex("job_applications_job_applicant_unique").on(table.jobId, table.applicantId),
    index("job_applications_applicant_idx").on(table.applicantId, table.createdAt.desc()),
    check("job_applications_message_length", sql`char_length(${table.message}) <= 1000`),
  ],
);

/** The portfolio pieces (the applicant's own posts) attached to an application. */
export const jobApplicationPosts = pgTable(
  "job_application_posts",
  {
    applicationId: text("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
  },
  (table) => [
    primaryKey({ name: "job_application_posts_pk", columns: [table.applicationId, table.postId] }),
    check("job_application_posts_position_range", sql`${table.position} between 0 and 3`),
  ],
);

export const jobsRelations = relations(jobs, ({ many }) => ({
  applications: many(jobApplications),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  job: one(jobs, { fields: [jobApplications.jobId], references: [jobs.id] }),
  applicant: one(user, { fields: [jobApplications.applicantId], references: [user.id] }),
  pieces: many(jobApplicationPosts),
}));

export type Job = typeof jobs.$inferSelect;
export type JobApplication = typeof jobApplications.$inferSelect;
