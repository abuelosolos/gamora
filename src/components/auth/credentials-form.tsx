"use client"

import * as React from "react"
import { useActionState } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { GoogleButton } from "@/components/auth/provider-buttons"
import { Button } from "@/components/ui/button"
import { PasswordField } from "@/components/ui/password-field"
import { TextField } from "@/components/ui/text-field"
import type { AuthFormState, CheckEmailResult } from "@/server/actions/auth"

/**
 * Email-first sign-in. Step 1 asks for the email and the server answers with one
 * word: "password" (existing account: enter the password), "google" (the account
 * uses Google: show the Google button) or "new" (create a password of at least 10
 * characters). Steps 2 sign in or create the account through the same existing
 * action, which lands on onboarding. The actions are passed in; this component
 * only renders what they return. Form-level errors are generic by design (see
 * src/server/actions/auth.ts).
 */
export interface CredentialsFormProps {
  /** Existing sign-in / sign-up action. */
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>
  /** Step 1: how does this email sign in? */
  checkEmail: (input: unknown) => Promise<CheckEmailResult>
  /** Already validated with safeNextPath on the server. */
  next: string
  /** Rendered under the form on the first step (other providers, notes). */
  extra?: React.ReactNode
}

type Step = { kind: "email" } | { kind: "password" | "new" | "google"; email: string }

const NEW_PASSWORD_MIN = 10

function CredentialsForm({ action, checkEmail, next, extra }: CredentialsFormProps) {
  const formId = React.useId()
  const [step, setStep] = React.useState<Step>({ kind: "email" })
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [checking, startChecking] = React.useTransition()

  const [state, formAction, signing] = useActionState(action, {})
  const [password, setPassword] = React.useState("")
  const [shortError, setShortError] = React.useState("")

  function submitEmail(event: React.FormEvent) {
    event.preventDefault()
    if (checking) return
    setEmailError("")
    startChecking(async () => {
      try {
        const result = await checkEmail({ email })
        if (!result.ok) {
          setEmailError(result.message)
          return
        }
        setPassword("")
        setShortError("")
        setStep({ kind: result.method, email: email.trim().toLowerCase() })
      } catch {
        setEmailError("Something went wrong. Try again.")
      }
    })
  }

  function backToEmail() {
    setStep({ kind: "email" })
    setPassword("")
    setShortError("")
  }

  // ---- Step 1: email ----
  if (step.kind === "email") {
    return (
      <AuthScreen
        title="Continue with email"
        description="Enter your email. We will find your account, or help you create one."
        backHref="/"
        footer={
          <Button type="submit" form={formId} fullWidth loading={checking} className="min-h-15 rounded-ui-lg">
            Continue
          </Button>
        }
      >
        <form id={formId} onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
          <TextField
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            message={emailError ? { tone: "error", text: emailError } : null}
          />
        </form>
        {extra}
      </AuthScreen>
    )
  }

  // ---- Step 2: Google-only account ----
  if (step.kind === "google") {
    return (
      <AuthScreen
        title="Use Google to sign in"
        description="This email is linked to a Google account. Continue with Google to sign in."
        onBack={backToEmail}
      >
        <div className="flex flex-col gap-3">
          <GoogleButton next={next} />
          <Button type="button" variant="ghost" fullWidth onClick={backToEmail}>
            Use a different email
          </Button>
        </div>
      </AuthScreen>
    )
  }

  // ---- Step 2: password (existing account) or create a password (new) ----
  const isNew = step.kind === "new"
  const fieldMessage = shortError
    ? { tone: "error" as const, text: shortError }
    : state.fieldErrors?.password
      ? { tone: "error" as const, text: state.fieldErrors.password }
      : isNew
        ? { tone: "hint" as const, text: `Use at least ${NEW_PASSWORD_MIN} characters.` }
        : null

  return (
    <AuthScreen
      title={isNew ? "Create your account" : "Welcome back"}
      description={
        isNew
          ? `Choose a password for ${step.email}.`
          : `Enter the password for ${step.email} to sign in.`
      }
      onBack={backToEmail}
      footer={
        <Button type="submit" form={formId} fullWidth loading={signing} className="min-h-15 rounded-ui-lg">
          {isNew ? "Create account" : "Sign in"}
        </Button>
      }
    >
      <form
        id={formId}
        action={formAction}
        noValidate
        onSubmit={(event) => {
          if (isNew && password.length < NEW_PASSWORD_MIN) {
            event.preventDefault()
            setShortError(`Use at least ${NEW_PASSWORD_MIN} characters.`)
          }
        }}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={step.email} />
        <PasswordField
          label={isNew ? "Create a password" : "Password"}
          name="password"
          autoComplete={isNew ? "new-password" : "current-password"}
          required
          autoFocus
          maxLength={128}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setShortError("")
          }}
          message={fieldMessage}
        />
        {state.error ? (
          <p role="alert" className="text-body-sm text-statusError">
            {state.error}
          </p>
        ) : null}
        <Button type="button" variant="ghost" onClick={backToEmail} className="self-start">
          Use a different email
        </Button>
      </form>
    </AuthScreen>
  )
}

export { CredentialsForm }
