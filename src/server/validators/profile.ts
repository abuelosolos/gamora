import { z } from "zod"
import { INTERESTS, MAX_INTERESTS } from "@/lib/interests"
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

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
