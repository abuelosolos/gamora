import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * App data for a signed-up user. Kept out of the Better Auth `user` table on
 * purpose, so nothing here (especially is_admin) can be set through an auth
 * endpoint. The display name lives in `user.name`.
 *
 * A user without a profile row has not finished onboarding.
 */
export const profileRole = pgEnum("profile_role", ["artist", "hirer"]);

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    bio: text("bio").notNull().default(""),
    role: profileRole("role").notNull().default("artist"),
    avatarUrl: text("avatar_url"),
    interests: text("interests")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Art categories the artist creates (up to 4). Shown in the profile head. Not the onboarding interests. */
    categories: text("categories")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** "remote" or an ISO 3166-1 alpha-2 country code. Chosen from a list. */
    location: text("location"),
    /** Private: only the owner's edit screen reads it. Never part of the public profile. */
    birthday: date("birthday", { mode: "string" }),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("profile_username_unique").on(table.username),
    // Backstops for the Zod validators: 3 to 20 lowercase letters, digits, underscore.
    check("profile_username_format", sql`${table.username} ~ '^[a-z0-9_]{3,20}$'`),
    check("profile_bio_length", sql`char_length(${table.bio}) <= 160`),
    check("profile_categories_max", sql`cardinality(${table.categories}) <= 4`),
    check("profile_location_format", sql`${table.location} is null or ${table.location} ~ '^(remote|[A-Z]{2})$'`),
  ],
);

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
