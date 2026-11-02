ALTER TABLE "profile" ADD COLUMN "categories" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "birthday" date;--> statement-breakpoint
ALTER TABLE "post_images" ADD COLUMN "blur_data" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "subscribers_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_categories_max" CHECK (cardinality("profile"."categories") <= 4);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_location_format" CHECK ("profile"."location" is null or "profile"."location" ~ '^(remote|[A-Z]{2})$');--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_blur_length" CHECK ("post_images"."blur_data" is null or char_length("post_images"."blur_data") <= 2000);