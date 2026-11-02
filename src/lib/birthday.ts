/**
 * Date of birth rules, shared by the edit form (the date picker's min and max)
 * and the server validator. Dates are plain "YYYY-MM-DD" strings in UTC, so no
 * time zone can shift the day.
 */
export const MIN_AGE = 13
export const EARLIEST_BIRTH_DATE = "1900-01-01"

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = ISO.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const date = new Date(Date.UTC(y, m - 1, d))
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  return real ? { y, m, d } : null
}

export type BirthdayProblem = "invalid" | "too_old" | "too_young"

/** null when the date is allowed. */
export function checkBirthday(value: string, now: Date = new Date()): BirthdayProblem | null {
  const parsed = parseIsoDate(value)
  if (!parsed) return "invalid"
  if (value < EARLIEST_BIRTH_DATE) return "too_old"
  const nowY = now.getUTCFullYear()
  const nowM = now.getUTCMonth() + 1
  const nowD = now.getUTCDate()
  let age = nowY - parsed.y
  if (nowM < parsed.m || (nowM === parsed.m && nowD < parsed.d)) age -= 1
  return age < MIN_AGE ? "too_young" : null
}

export const BIRTHDAY_MESSAGES: Record<BirthdayProblem, string> = {
  invalid: "Enter a valid date.",
  too_old: "Enter a valid date.",
  too_young: `You must be at least ${MIN_AGE} to use Gamora.`,
}

/** The latest date that is still allowed (today minus MIN_AGE years). Feb 29 becomes Feb 28 in non-leap years. */
export function latestBirthday(now: Date = new Date()): string {
  const y = now.getUTCFullYear() - MIN_AGE
  const m = now.getUTCMonth() + 1
  let d = now.getUTCDate()
  const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (d > lastDayOfMonth) d = lastDayOfMonth
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/** "December 10, 2006". Always English and UTC so server and browser agree. */
export function formatBirthday(value: string): string {
  const parsed = parseIsoDate(value)
  if (!parsed) return value
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  )
}
