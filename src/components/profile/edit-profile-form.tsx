"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { TopNavbar } from "@/components/layout/top-navbar"
import { AvatarPicker } from "@/components/onboarding/avatar-picker"
import { BirthdayField } from "@/components/profile/birthday-field"
import { CategoryRows } from "@/components/profile/category-rows"
import { LocationPicker } from "@/components/profile/location-picker"
import { LineInput, LineTextarea } from "@/components/ui/line-field"
import { useToast } from "@/components/ui/toast"
import { BIRTHDAY_MESSAGES, checkBirthday } from "@/lib/birthday"
import { cn } from "@/lib/utils"
import { checkUsernameAction, type UsernameCheck, uploadAvatarAction } from "@/server/actions/onboarding"
import { updateProfileAction } from "@/server/actions/profile"
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  BIO_MAX,
  bioSchema,
  categoriesSchema,
  categoryNameSchema,
  displayNameSchema,
  usernameSchema,
} from "@/server/validators/profile"

/**
 * Figma: "Settings (Edit Profile)" and "Settings (Edit Profile Empty)". Plain
 * text on lines (see LineInput): the avatar with the name and @username beside
 * it, then Bio, Location, Date of birth and Category. Save sits in the top bar
 * and stays grey until something changed and every field is valid.
 *
 * Location is picked from a list, the birthday from the device's own calendar,
 * and categories are typed, one line each ("Add Category" adds a line).
 *
 * Deviations from the design: labels and placeholders use textSecondary, not
 * textDisabled (under 4.5:1); the category label reads "Category (2 of 4)".
 * The username is checked for availability as you type; the server checks again.
 */
export interface EditProfileFormProps {
  initial: {
    displayName: string
    username: string
    bio: string
    avatarUrl: string | null
    categories: string[]
    location: string | null
    birthday: string | null
  }
}

const FORM_ID = "edit-profile-form"

type UsernameState =
  | { status: "unchanged" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string }

const tidy = (value: string) => value.trim().replace(/\s+/g, " ")

/** One message per category line: too short, wrong characters, or repeated. */
function categoryErrors(rows: string[]): (string | null)[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    if (row.trim() === "") return null
    const parsed = categoryNameSchema.safeParse(row)
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Check this category."
    const key = parsed.data.toLowerCase()
    if (seen.has(key)) return "Each category must be different."
    seen.add(key)
    return null
  })
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-caption text-textSecondary">
      {children}
    </label>
  )
}

function EditProfileForm({ initial }: EditProfileFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [displayName, setDisplayName] = React.useState(initial.displayName)
  const [username, setUsername] = React.useState(initial.username)
  const [bio, setBio] = React.useState(initial.bio)
  const [location, setLocation] = React.useState<string | null>(initial.location)
  const [birthday, setBirthday] = React.useState<string | null>(initial.birthday)
  const [categoryRows, setCategoryRows] = React.useState<string[]>(initial.categories)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initial.avatarUrl)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [serverFieldError, setServerFieldError] = React.useState<{ field: string; message: string } | null>(null)
  const [saving, startSave] = React.useTransition()
  const [usernameResult, setUsernameResult] = React.useState<{ value: string; check: UsernameCheck } | null>(null)

  const nameParsed = displayNameSchema.safeParse(displayName)
  const bioParsed = bioSchema.safeParse(bio)
  const usernameParsed = usernameSchema.safeParse(username)
  const categoriesParsed = categoriesSchema.safeParse(categoryRows)
  const rowErrors = categoryErrors(categoryRows)
  const birthdayProblem = birthday ? checkBirthday(birthday) : null
  const checkedUsername = usernameParsed.success && usernameParsed.data !== initial.username ? usernameParsed.data : null

  const usernameState: UsernameState =
    username.trim().toLowerCase() === initial.username
      ? { status: "unchanged" }
      : !usernameParsed.success
        ? { status: "invalid", message: usernameParsed.error.issues[0]?.message ?? "Invalid username." }
        : usernameResult?.value === usernameParsed.data
          ? usernameResult.check.status === "available"
            ? { status: "available" }
            : usernameResult.check.status === "taken"
              ? { status: "taken" }
              : {
                  status: "error",
                  message: usernameResult.check.status === "error" ? usernameResult.check.message : "Invalid username.",
                }
          : { status: "checking" }

  // Live availability check, debounced. A newer keystroke cancels the older request.
  React.useEffect(() => {
    if (!checkedUsername) return
    let cancelled = false
    const timer = setTimeout(async () => {
      let check: UsernameCheck
      try {
        check = await checkUsernameAction(checkedUsername)
      } catch {
        check = { status: "error", message: "Could not check right now." }
      }
      if (!cancelled) setUsernameResult({ value: checkedUsername, check })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [checkedUsername])

  // Free the preview object URL when it is replaced or the form closes.
  React.useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const cleanCategories = categoryRows.filter((row) => row.trim() !== "").map(tidy)
  const sameCategories =
    cleanCategories.length === initial.categories.length && cleanCategories.every((name, i) => name === initial.categories[i])

  const dirty =
    tidy(displayName) !== initial.displayName ||
    username.trim().toLowerCase() !== initial.username ||
    bio.trim() !== initial.bio ||
    avatarUrl !== initial.avatarUrl ||
    location !== initial.location ||
    birthday !== initial.birthday ||
    !sameCategories

  const valid =
    nameParsed.success &&
    bioParsed.success &&
    categoriesParsed.success &&
    rowErrors.every((error) => error === null) &&
    birthdayProblem === null &&
    (usernameState.status === "unchanged" || usernameState.status === "available")

  const canSave = dirty && valid && !avatarBusy && !saving

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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || !nameParsed.success || !usernameParsed.success || !bioParsed.success || !categoriesParsed.success) return
    setSubmitError(null)
    setServerFieldError(null)
    startSave(async () => {
      try {
        const result = await updateProfileAction({
          displayName: nameParsed.data,
          username: usernameParsed.data,
          bio: bioParsed.data,
          avatarUrl,
          categories: categoriesParsed.data,
          location,
          birthday,
        })
        if (result.ok) {
          toast({ variant: "success", title: "Profile saved" })
          router.replace(`/u/${result.username}`)
          router.refresh()
          return
        }
        if (result.field) setServerFieldError({ field: result.field, message: result.message })
        else setSubmitError(result.message)
      } catch {
        setSubmitError("Something went wrong. Try again.")
      }
    })
  }

  const fromServer = (field: string) => (serverFieldError?.field === field ? serverFieldError.message : null)

  const nameMessage =
    !nameParsed.success && displayName !== initial.displayName
      ? (nameParsed.error.issues[0]?.message ?? null)
      : fromServer("displayName")
  const usernameMessage =
    usernameState.status === "invalid" || usernameState.status === "error"
      ? { tone: "error" as const, text: usernameState.message }
      : usernameState.status === "taken"
        ? { tone: "error" as const, text: "This username is taken." }
        : usernameState.status === "available"
          ? { tone: "success" as const, text: "This username is available." }
          : usernameState.status === "checking"
            ? { tone: "hint" as const, text: "Checking…" }
            : fromServer("username")
              ? { tone: "error" as const, text: fromServer("username")! }
              : null
  const bioMessage = !bioParsed.success ? (bioParsed.error.issues[0]?.message ?? null) : fromServer("bio")
  const birthdayMessage = birthdayProblem ? BIRTHDAY_MESSAGES[birthdayProblem] : fromServer("birthday")
  const avatarMessage = avatarError ?? fromServer("avatar")
  const categoryMessage =
    !categoriesParsed.success && rowErrors.every((error) => error === null)
      ? (categoriesParsed.error.issues[0]?.message ?? null)
      : fromServer("categories")

  return (
    <>
      <TopNavbar
        variant="settings"
        backHref={`/u/${initial.username}`}
        formId={FORM_ID}
        saving={saving}
        canSave={canSave}
      />

      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pt-4 pb-8">
        <div className="flex items-start gap-4 px-5">
          <AvatarPicker
            compact
            src={avatarPreview ?? avatarUrl}
            name={tidy(displayName) || initial.displayName}
            busy={avatarBusy}
            error={avatarError}
            onPick={(file) => void pickAvatar(file)}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-col">
              <label htmlFor="display-name" className="sr-only">
                Display name
              </label>
              <LineInput
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={60}
                autoComplete="name"
                aria-invalid={nameMessage ? true : undefined}
                aria-describedby={nameMessage ? "display-name-message" : undefined}
                className="font-display text-title-s font-semibold"
              />
              {nameMessage ? (
                <p id="display-name-message" role="alert" className="pt-1 text-caption text-statusError">
                  {nameMessage}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col">
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <div className="relative flex items-center">
                <span aria-hidden="true" className="pointer-events-none absolute left-0 text-caption text-textPrimary">
                  @
                </span>
                <LineInput
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  aria-invalid={usernameMessage?.tone === "error" ? true : undefined}
                  aria-describedby={usernameMessage ? "username-message" : undefined}
                  className="pl-3.5"
                />
              </div>
              {usernameMessage ? (
                <p
                  id="username-message"
                  role={usernameMessage.tone === "error" ? "alert" : "status"}
                  className={cn(
                    "pt-1 text-caption",
                    usernameMessage.tone === "error" && "text-statusError",
                    usernameMessage.tone === "success" && "text-statusSuccess",
                    usernameMessage.tone === "hint" && "text-textSecondary"
                  )}
                >
                  {usernameMessage.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {avatarBusy ? (
          <p role="status" className="px-5 text-caption text-textSecondary">
            Uploading picture…
          </p>
        ) : avatarMessage ? (
          <p role="alert" className="px-5 text-caption text-statusError">
            {avatarMessage}
          </p>
        ) : null}

        <div className="flex flex-col px-5">
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <LineTextarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell us about yourself"
            aria-invalid={bioMessage ? true : undefined}
            aria-describedby="bio-hint"
          />
          <div id="bio-hint" className="flex items-start justify-between gap-3 pt-1 text-caption">
            <span role={bioMessage ? "alert" : undefined} className="text-statusError">
              {bioMessage}
            </span>
            <span className={cn("ml-auto shrink-0", bio.trim().length > BIO_MAX ? "text-statusError" : "text-textSecondary")}>
              {bio.trim().length}/{BIO_MAX}
            </span>
          </div>
        </div>

        <div className="flex flex-col px-5">
          <FieldLabel htmlFor="location">Location</FieldLabel>
          <LocationPicker id="location" value={location} onChange={setLocation} />
          {fromServer("location") ? (
            <p role="alert" className="pt-1 text-caption text-statusError">
              {fromServer("location")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col px-5">
          <FieldLabel htmlFor="birthday">Date of birth</FieldLabel>
          <BirthdayField id="birthday" value={birthday} onChange={setBirthday} error={birthdayMessage} />
        </div>

        <div className="flex flex-col px-5">
          <CategoryRows idPrefix="category" rows={categoryRows} errors={rowErrors} onChange={setCategoryRows} />
          {categoryMessage ? (
            <p role="alert" className="pt-1 text-caption text-statusError">
              {categoryMessage}
            </p>
          ) : null}
        </div>

        {submitError ? (
          <p role="alert" className="px-5 text-caption text-statusError">
            {submitError}
          </p>
        ) : null}
      </form>
    </>
  )
}

export { EditProfileForm }
