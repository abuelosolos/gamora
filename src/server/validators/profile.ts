import { z } from "zod"
import { BIRTHDAY_MESSAGES, checkBirthday } from "@/lib/birthday"
import { INTERESTS, MAX_INTERESTS } from "@/lib/interests"
import { isLocation } from "@/lib/locations"
import { isReservedUsername } from "@/lib/reserved-usernames"

/** Same rule as the database check constraint `profile_username_format`. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(20, "Use 20 characters or fewer.")
  .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers and underscores.")
  .refine((value) => !isReservedUsername(value), "This username is not available.")

// Letters (any script), combining marks, spaces, apostrophes and hyphens.
const namePart = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(40, "Use 40 characters or fewer.")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u, "Use letters only.")

export const nameSchema = z.object({
  firstName: namePart,
  lastName: namePart,
  middleName: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    namePart.optional()
  ),
})

/** Only the artist role can be chosen for now; hirer shows Coming soon. */
export const roleSchema = z.literal("artist")

export const interestsSchema = z
  .array(z.enum(INTERESTS))
  .max(MAX_INTERESTS, `Choose up to ${MAX_INTERESTS}.`)
  .transform((list) => [...new Set(list)])

export const completeOnboardingSchema = z.object({
  role: roleSchema,
  firstName: nameSchema.shape.firstName,
  lastName: nameSchema.shape.lastName,
  middleName: nameSchema.shape.middleName,
  username: usernameSchema,
  interests: interestsSchema,
  avatarUrl: z.string().url().max(500).nullable(),
  next: z.string().max(2048).nullable().optional(),
})

export type CompleteOnboardingInput = z.input<typeof completeOnboardingSchema>

export const BIO_MAX = 160
export const DISPLAY_NAME_MAX = 60

/** Same rule as the database check constraint `profile_bio_length`. */
export const bioSchema = z.string().trim().max(BIO_MAX, `Use ${BIO_MAX} characters or fewer.`)

// Same letter rule as the onboarding name parts, for one combined field.
export const displayNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Enter your name.")
      .max(DISPLAY_NAME_MAX, `Use ${DISPLAY_NAME_MAX} characters or fewer.`)
      .regex(/^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u, "Use letters only.")
  )

export const CATEGORY_MAX = 4
export const CATEGORY_NAME_MAX = 30

// Art categories the artist makes up: a short plain-text name.
export const categoryNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Use at least 2 characters.")
      .max(CATEGORY_NAME_MAX, `Use ${CATEGORY_NAME_MAX} characters or fewer.`)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} &-]*$/u, "Use letters, numbers, spaces, & and - only.")
  )

/** Empty rows are dropped, then up to 4 names with no repeats (ignoring case). */
export const categoriesSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry !== "string" || entry.trim() !== "") : value),
  z
    .array(categoryNameSchema)
    .max(CATEGORY_MAX, `Choose up to ${CATEGORY_MAX}.`)
    .refine((list) => new Set(list.map((name) => name.toLowerCase())).size === list.length, "Each category must be different.")
)

/** "remote" or a country code from the list, or nothing. */
export const locationSchema = z.string().refine(isLocation, "Choose a location from the list.").nullable()

/** Private. "YYYY-MM-DD", a real date, 13 or older, or nothing. */
export const birthdaySchema = z
  .string()
  .superRefine((value, ctx) => {
    const problem = checkBirthday(value)
    if (problem) ctx.addIssue({ code: "custom", message: BIRTHDAY_MESSAGES[problem] })
  })
  .nullable()

/**
 * Edit profile. There is no user id here on purpose: the profile being changed
 * is always the signed-in user's, taken from the session.
 */
export const updateProfileSchema = z.strictObject({
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: bioSchema,
  avatarUrl: z.string().url().max(500).nullable(),
  categories: categoriesSchema,
  location: locationSchema,
  birthday: birthdaySchema,
})

export type UpdateProfileInput = z.input<typeof updateProfileSchema>

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
