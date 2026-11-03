CREATE TYPE "public"."job_medium" AS ENUM('digital', 'traditional', 'sculpture', 'paper', 'mixed');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "category" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "medium" "job_medium" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "art_styles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "deliverables" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "requirements" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "timeline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_art_styles_max" CHECK (cardinality("jobs"."art_styles") <= 6);