-- Replies are posts that point at their parent (posts.parent_id).
-- 1. Let notifications stop pointing at the comments table.
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_comment_id_comments_id_fk";
--> statement-breakpoint
-- 2. The new column and its index.
ALTER TABLE "posts" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_parent_idx" ON "posts" USING btree ("parent_id","created_at","id");--> statement-breakpoint
-- 3. Copy every existing comment into posts, keeping its id, so notifications.comment_id still matches.
INSERT INTO "posts" ("id", "author_id", "body", "parent_id", "created_at", "updated_at")
SELECT "id", "author_id", "body", "post_id", "created_at", "created_at" FROM "comments"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- 4. Now notifications.comment_id can point at posts. The comments table stays, unused, until a later migration drops it.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_posts_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
