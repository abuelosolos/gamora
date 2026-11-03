import { z } from "zod"

/**
 * Delete account. There is no user id in the input: the account that goes is
 * always the session user's. `confirm` must be literally true, so a stray or
 * empty request body cannot delete anything.
 */
export const deleteAccountSchema = z.strictObject({
  confirm: z.literal(true),
})

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
