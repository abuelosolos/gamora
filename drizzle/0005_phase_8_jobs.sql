CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'contract', 'freelance');--> statement-breakpoint
CREATE TABLE "job_application_posts" (
	"application_id" text NOT NULL,
	"post_id" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "job_application_posts_pk" PRIMARY KEY("application_id","post_id"),
	CONSTRAINT "job_application_posts_position_range" CHECK ("job_application_posts"."position" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"applicant_id" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_applications_message_length" CHECK (char_length("job_applications"."message") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"poster_name" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"pay_amount" integer NOT NULL,
	"pay_unit" text NOT NULL,
	"is_sample" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_pay_positive" CHECK ("jobs"."pay_amount" > 0),
	CONSTRAINT "jobs_title_length" CHECK (char_length("jobs"."title") <= 120)
);
--> statement-breakpoint
ALTER TABLE "job_application_posts" ADD CONSTRAINT "job_application_posts_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application_posts" ADD CONSTRAINT "job_application_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_applicant_id_user_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_job_applicant_unique" ON "job_applications" USING btree ("job_id","applicant_id");--> statement-breakpoint
CREATE INDEX "job_applications_applicant_idx" ON "job_applications" USING btree ("applicant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("job_type","created_at" DESC NULLS LAST);