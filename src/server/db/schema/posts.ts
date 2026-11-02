import { relations, sql } from "drizzle-orm";
import {
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
  },
  (table) => [
    index("post_images_post_idx").on(table.postId),
    uniqueIndex("post_images_post_position_unique").on(table.postId, table.position),
    check("post_images_position_range", sql`${table.position} between 0 and 3`),
    check("post_images_alt_length", sql`char_length(${table.altText}) <= 500`),
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
