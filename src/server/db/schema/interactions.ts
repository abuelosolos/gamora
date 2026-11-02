import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { posts } from "./posts";

/**
 * Likes, bookmarks and reposts use a composite primary key on (user_id, post_id).
 * That is the unique constraint: a user can do each of them to a post only once,
 * and toggle actions can insert with ON CONFLICT DO NOTHING to stay idempotent.
 * The post_id index serves the per-post counts.
 */
export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "likes_user_post_pk", columns: [table.userId, table.postId] }),
    index("likes_post_idx").on(table.postId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "bookmarks_user_post_pk", columns: [table.userId, table.postId] }),
    index("bookmarks_post_idx").on(table.postId),
    // A user's saved posts, newest first.
    index("bookmarks_user_idx").on(table.userId, table.createdAt.desc()),
  ],
);

export const reposts = pgTable(
  "reposts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "reposts_user_post_pk", columns: [table.userId, table.postId] }),
    index("reposts_post_idx").on(table.postId),
    index("reposts_user_idx").on(table.userId, table.createdAt.desc()),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // A post's comments in order, with (created_at, id) as the cursor.
    index("comments_post_idx").on(table.postId, table.createdAt, table.id),
    index("comments_author_idx").on(table.authorId),
    // Backstop for the Zod validator.
    check(
      "comments_body_length",
      sql`char_length(${table.body}) between 1 and 1000`,
    ),
  ],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "follows_follower_following_pk",
      columns: [table.followerId, table.followingId],
    }),
    // Follower counts and "who follows me".
    index("follows_following_idx").on(table.followingId),
    check("follows_no_self_follow", sql`${table.followerId} <> ${table.followingId}`),
  ],
);

export const notificationType = pgEnum("notification_type", [
  "like",
  "repost",
  "comment",
  "follow",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Inbox, newest first, with (created_at, id) as the cursor.
    index("notifications_recipient_idx").on(
      table.recipientId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // Unread badge count.
    index("notifications_unread_idx")
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
    // Nothing is created for your own actions.
    check("notifications_no_self", sql`${table.recipientId} <> ${table.actorId}`),
    // Follows have no post; every other type points at one.
    check(
      "notifications_post_required",
      sql`${table.type} = 'follow' or ${table.postId} is not null`,
    ),
  ],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(user, { fields: [comments.authorId], references: [user.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(user, {
    fields: [notifications.recipientId],
    references: [user.id],
    relationName: "notification_recipient",
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
    relationName: "notification_actor",
  }),
  post: one(posts, { fields: [notifications.postId], references: [posts.id] }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
