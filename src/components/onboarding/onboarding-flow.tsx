"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { At, PaintBrush, SuitcaseSimple, User } from "@/components/icons"
import { AuthScreen } from "@/components/auth/auth-screen"
import { AvatarPicker } from "@/components/onboarding/avatar-picker"
import { RoleOption } from "@/components/onboarding/role-option"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { TextField, type TextFieldMessage } from "@/components/ui/text-field"
import { INTERESTS, MAX_INTERESTS, VISIBLE_INTERESTS, type Interest } from "@/lib/interests"
import {
  checkUsernameAction,
  completeOnboardingAction,
  uploadAvatarAction,
} from "@/server/actions/onboarding"
import { AVATAR_MAX_BYTES, AVATAR_TYPES, nameSchema, usernameSchema } from "@/server/validators/profile"

/**
 * Figma: Auth wizard. Role, name, username, avatar, interests. The account
 * already exists (email or Google) before this runs; the profile row is created
 * once, on the last step, by completeOnboardingAction.
 *
 * Not built here: the "Connect withdrawal account" step. It is wallet, which
 * renders Coming soon.
 */
const STEPS = ["role", "name", "username", "avatar", "interests"] as const
type Step = (typeof STEPS)[number]

type UsernameState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string }

/** Result of the server check for one specific username. */
type UsernameCheckResult = { value: string; state: UsernameState }

export interface OnboardingFlowProps {
  /** Already validated with safeNextPath on the server. */
  next: string
}

function OnboardingFlow({ next }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("role")

  const [firstName, setFirstName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [lastName, setLastName] = React.useState("")

  const [username, setUsername] = React.useState("")
  const [usernameResult, setUsernameResult] = React.useState<UsernameCheckResult | null>(null)

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState<string | null>(null)

  const [interests, setInterests] = React.useState<Interest[]>([])
  const [showAll, setShowAll] = React.useState(false)

  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitting, startSubmit] = React.useTransition()

  const nameResult = nameSchema.safeParse({ firstName, lastName, middleName })
  const displayName = [firstName, middleName, lastName].filter((part) => part.trim()).join(" ") || "You"

  // Shape errors come straight from the schema; availability from the server.
  const usernameParsed = usernameSchema.safeParse(username)
  const checkedValue = usernameParsed.success ? usernameParsed.data : null
  const usernameState: UsernameState =
    username === ""
      ? { status: "idle" }
      : !usernameParsed.success
        ? { status: "invalid", message: usernameParsed.error.issues[0]?.message ?? "Invalid username." }
        : usernameResult?.value === usernameParsed.data
          ? usernameResult.state
          : { status: "checking" }

  // Live availability check, debounced. A newer keystroke cancels the older request.
  React.useEffect(() => {
    if (!checkedValue) return
    let cancelled = false
    const timer = setTimeout(async () => {
      let state: UsernameState
      try {
        state = await checkUsernameAction(checkedValue)
      } catch {
        state = { status: "error", message: "Could not check right now." }
      }
      if (!cancelled) setUsernameResult({ value: checkedValue, state })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [checkedValue])

  // Free the preview object URL when it is replaced or the flow closes.
  React.useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const stepIndex = STEPS.indexOf(step)
  const goBack = stepIndex > 0 ? () => setStep(STEPS[stepIndex - 1]!) : undefined
  const goNext = () => setStep(STEPS[stepIndex + 1]!)

  async function pickAvatar(file: File) {
    setAvatarError(null)
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError("Use a JPEG, PNG or WebP image.")
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Image must be 2 MB or smaller.")
      return
    }
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarUrl(null)
    setAvatarBusy(true)
    const body = new FormData()
    body.set("avatar", file)
    try {
      const result = await uploadAvatarAction(body)
      if (result.ok) setAvatarUrl(result.url)
      else {
        setAvatarError(result.error)
        setAvatarPreview(null)
      }
    } catch {
      setAvatarError("Upload failed. Try again.")
      setAvatarPreview(null)
    }
    setAvatarBusy(false)
  }

  function toggleInterest(value: Interest) {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length >= MAX_INTERESTS
          ? current
          : [...current, value]
    )
  }

  function finish(chosen: Interest[] = interests) {
    setSubmitError(null)
    startSubmit(async () => {
      let result
      try {
        result = await completeOnboardingAction({
          role: "artist",
          firstName,
          lastName,
          middleName,
          username,
          interests: chosen,
          avatarUrl,
          next,
        })
      } catch {
        setSubmitError("Something went wrong. Try again.")
        return
      }
      if (result.ok) {
        router.replace(result.next)
        router.refresh()
        return
      }
      setSubmitError(result.error)
      if (result.field === "username") {
        if (checkedValue) setUsernameResult({ value: checkedValue, state: { status: "taken" } })
        setStep("username")
      } else if (result.field === "name") setStep("name")
      else if (result.field === "avatar") {
        setAvatarUrl(null)
        setAvatarPreview(null)
        setStep("avatar")
      }
    })
  }

  const usernameMessage: TextFieldMessage | null =
    username === ""
      ? { tone: "hint", text: "3 to 20 characters: a-z, 0-9 and _" }
      : usernameState.status === "available"
        ? { tone: "success", text: "This username is available" }
        : usernameState.status === "checking"
          ? { tone: "hint", text: "Checking…" }
          : usernameState.status === "taken"
            ? { tone: "error", text: "This username is taken." }
            : usernameState.status === "invalid" || usernameState.status === "error"
              ? { tone: "error", text: usernameState.message }
              : null

  const primary = (label: string, onClick: () => void, disabled: boolean, loading = false) => (
    <Button type="button" fullWidth disabled={disabled} loading={loading} onClick={onClick} className="min-h-15 rounded-ui-lg">
      {label}
    </Button>
  )
  const skip = (onClick: () => void) => (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="text-textSecondary">
      Skip for now
    </Button>
  )

  if (step === "role") {
    return (
      <AuthScreen title="What are you doing on Gamora?" footer={primary("Continue", goNext, false)}>
        <div role="radiogroup" aria-label="Your role" className="flex flex-col gap-1">
          <RoleOption label="Just a passerby" icon={<User />} comingSoon />
          <RoleOption label="I’m an artist" icon={<PaintBrush />} selected />
          <RoleOption label="I want to hire Artists" icon={<SuitcaseSimple />} comingSoon />
        </div>
      </AuthScreen>
    )
  }

  if (step === "name") {
    return (
      <AuthScreen
        title="Setup your profile"
        onBack={goBack}
        footer={primary("Continue", goNext, !nameResult.success)}
      >
        <div className="flex flex-col gap-5">
          <TextField label="First name" name="given-name" autoComplete="given-name" placeholder="John" maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextField label="Last name" name="family-name" autoComplete="family-name" placeholder="Doe" maxLength={40} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <TextField label="Middle name (optional)" name="additional-name" autoComplete="additional-name" placeholder="Doe" maxLength={40} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
        </div>
      </AuthScreen>
    )
  }

  if (step === "username") {
    return (
      <AuthScreen
        title="Setup your profile"
        onBack={goBack}
        footer={
          <>
            {submitError ? (
              <p role="alert" className="text-body-sm text-statusError">
                {submitError}
              </p>
            ) : null}
            {primary("Continue", goNext, usernameState.status !== "available" || username === "")}
          </>
        }
      >
        <TextField
          label="Select username"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="drealjohndoe"
          maxLength={20}
          leadingIcon={<At />}
          value={username}
          onChange={(e) => {
            const value = e.target.value.toLowerCase()
            setUsername(value)
            setSubmitError(null)
          }}
          message={usernameMessage}
        />
      </AuthScreen>
    )
  }

  if (step === "avatar") {
    return (
      <AuthScreen
        title="Upload profile picture"
        onBack={goBack}
        className="pb-0"
        footer={
          <>
            {skip(() => {
              setAvatarUrl(null)
              setAvatarPreview(null)
              goNext()
            })}
            {primary("Continue", goNext, !avatarUrl || avatarBusy)}
          </>
        }
      >
        <AvatarPicker src={avatarPreview} name={displayName} busy={avatarBusy} error={avatarError} onPick={pickAvatar} />
      </AuthScreen>
    )
  }

  const visible = showAll ? INTERESTS : INTERESTS.slice(0, VISIBLE_INTERESTS)
  return (
    <AuthScreen
      title="What type of art would you like to see"
      onBack={goBack}
      footer={
        <>
          {submitError ? (
            <p role="alert" className="text-body-sm text-statusError">
              {submitError}
            </p>
          ) : null}
          {skip(() => {
            setInterests([])
            finish([])
          })}
          {primary("Done", () => finish(), false, submitting)}
        </>
      }
    >
      <p className="text-caption text-textSecondary">You can choose more than 1</p>
      <div role="group" aria-label="Art types" className="flex flex-wrap gap-2.5">
        {visible.map((interest) => (
          <Chip
            key={interest}
            variant="fill"
            selected={interests.includes(interest)}
            onClick={() => toggleInterest(interest)}
          >
            {interest}
          </Chip>
        ))}
      </div>
      {!showAll ? (
        <Button type="button" variant="link" size="sm" className="self-start px-0 text-textSecondary" onClick={() => setShowAll(true)}>
          See more
        </Button>
      ) : null}
    </AuthScreen>
  )
}

export { OnboardingFlow }
