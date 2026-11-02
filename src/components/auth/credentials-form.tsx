"use client"

import * as React from "react"
import { useActionState } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { Button } from "@/components/ui/button"
import { PasswordField } from "@/components/ui/password-field"
import { TextField } from "@/components/ui/text-field"
import type { AuthFormState } from "@/server/actions/auth"

/**
 * One email and password form for everyone: existing accounts sign in, new
 * emails get an account. The server action is passed in; this component only
 * renders what the action returns. Form-level errors are generic by design
 * (see src/server/actions/auth.ts).
 */
export interface CredentialsFormProps {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>
  /** Already validated with safeNextPath on the server. */
  next: string
  /** Rendered between the form fields and the footer (Google button, links). */
  extra?: React.ReactNode
}

function CredentialsForm({ action, next, extra }: CredentialsFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const formId = React.useId()

  return (
    <AuthScreen
      title="Continue with email"
      description="Already registered? You will be signed in. New here? We will create your account. New passwords need at least 10 characters."
      backHref="/"
      footer={
        <Button type="submit" form={formId} fullWidth loading={pending} className="min-h-15 rounded-ui-lg">
          Continue
        </Button>
      }
    >
      <form id={formId} action={formAction} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          message={state.fieldErrors?.email ? { tone: "error", text: state.fieldErrors.email } : null}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          message={state.fieldErrors?.password ? { tone: "error", text: state.fieldErrors.password } : null}
        />
        {state.error ? (
          <p role="alert" className="text-body-sm text-statusError">
            {state.error}
          </p>
        ) : null}
      </form>
      {extra}
    </AuthScreen>
  )
}

export { CredentialsForm }
