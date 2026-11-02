import { z } from "zod"

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Enter a valid email address.")
  .pipe(z.email("Enter a valid email address."))

/** Sign-up. The length matches Better Auth's minPasswordLength. */
export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(128, "Use 128 characters or fewer."),
})

/**
 * Sign-in only checks shape. It never tells the user which part was wrong, and
 * does not enforce the sign-up length so old accounts are not locked out.
 */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
