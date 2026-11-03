import { z } from "zod"
import { CATEGORY_NAME_MAX } from "@/server/validators/profile"

export const SEARCH_QUERY_MAX = 40
export const SEARCH_RESULTS_MAX = 20
export const SEARCH_HISTORY_MAX = 10

/** What the person typed: trimmed, a leading @ dropped (people type "@name"), 1 to 40 characters. */
export const searchQuerySchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, "").trim())
  .pipe(z.string().min(1, "Type a name or username.").max(SEARCH_QUERY_MAX, `Use ${SEARCH_QUERY_MAX} characters or fewer.`))

/** A category pill. Matched case-insensitively against what artists wrote on their profiles. */
export const searchCategorySchema = z.string().trim().min(1).max(CATEGORY_NAME_MAX)

/** Text, a category, or both. At least one is needed. */
export const searchInputSchema = z
  .strictObject({
    query: searchQuerySchema.optional(),
    category: searchCategorySchema.optional(),
  })
  .refine((value) => value.query !== undefined || value.category !== undefined, "Type a name or pick a category.")
export type SearchInput = z.infer<typeof searchInputSchema>

/** Remember a search or an opened profile. The client names the profile by username, as the URL does. */
export const recordSearchSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("query"), query: searchQuerySchema }),
  z.strictObject({ kind: z.literal("profile"), username: z.string().trim().min(1).max(30) }),
])
export type RecordSearchInput = z.infer<typeof recordSearchSchema>
