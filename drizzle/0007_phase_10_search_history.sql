CREATE TYPE "public"."search_history_kind" AS ENUM('query', 'profile');--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "search_history_kind" NOT NULL,
	"key" text NOT NULL,
	"term" text,
	"profile_user_id" text,
	"used_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_history_shape" CHECK (("search_history"."kind" = 'query' and "search_history"."term" is not null and "search_history"."profile_user_id" is null and char_length("search_history"."term") <= 40)
        or ("search_history"."kind" = 'profile' and "search_history"."profile_user_id" is not null and "search_history"."term" is null))
);
--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "search_history_user_kind_key_unique" ON "search_history" USING btree ("user_id","kind","key");--> statement-breakpoint
CREATE INDEX "search_history_user_used_idx" ON "search_history" USING btree ("user_id","used_at" DESC NULLS LAST);