import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const posts = pgTable(
  "posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    /**
     * Subscribers-only post. Everyone except the author sees it locked (blurred
     * placeholder, no image URL). There are no subscriptions yet, so for now
     * that means everyone but the author.
     */
    subscribersOnly: boolean("subscribers_only").notNull().default(false),
    /**
     * Set when this post is a reply: the post it answers. Replies are posts, so
     * they have likes, reposts, bookmarks and counts like any other. They are
     * left out of the feed and the profile's Posts tab.
     */
    parentId: text("parent_id").references((): AnyPgColumn => posts.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Feed order and cursor pagination: (created_at, id) descending.
    index("posts_created_at_idx").on(table.createdAt.desc(), table.id.desc()),
    // A profile's posts, newest first.
    index("posts_author_idx").on(table.authorId, table.createdAt.desc()),
    // A post's replies in order, with (created_at, id) as the cursor.
    index("posts_parent_idx").on(table.parentId, table.createdAt, table.id),
    // Backstop for the Zod validator.
    check("posts_body_length", sql`char_length(${table.body}) <= 2000`),
  ],
);

export const postImages = pgTable(
  "post_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    position: smallint("position").notNull(),
    altText: text("alt_text").notNull().default(""),
    /** Tiny blurred WebP data URI, safe to show on a locked post. Null until set. */
    blurData: text("blur_data"),
  },
  (table) => [
    index("post_images_post_idx").on(table.postId),
    uniqueIndex("post_images_post_position_unique").on(table.postId, table.position),
    check("post_images_position_range", sql`${table.position} between 0 and 3`),
    check("post_images_alt_length", sql`char_length(${table.altText}) <= 500`),
    check("post_images_blur_length", sql`${table.blurData} is null or char_length(${table.blurData}) <= 2000`),
  ],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(user, { fields: [posts.authorId], references: [user.id] }),
  images: many(postImages),
}));

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, { fields: [postImages.postId], references: [posts.id] }),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostImage = typeof postImages.$inferSelect;
