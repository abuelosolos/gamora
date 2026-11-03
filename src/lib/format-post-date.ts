const monthDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
const monthDayYear = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const fullStamp = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })

/**
 * "Nov 2". Pinned to UTC so the server and the browser print the same text
 * (no hydration mismatch). The exact time is in the <time> element's dateTime.
 */
export function formatPostDate(iso: string): string {
  return monthDay.format(new Date(iso))
}

/** Full date and time for a tooltip, e.g. "Nov 2, 2026, 2:32 PM UTC". */
export function formatPostStamp(iso: string): string {
  return `${fullStamp.format(new Date(iso))} UTC`
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Post age: "0s" to "59s", "1m" to "59m", "1h" to "23h", then the date
 * ("Nov 2", with the year when it is not this year). A time in the future
 * (clock difference) counts as "0s".
 */
export function formatPostTime(iso: string, now: number = Date.now()): string {
  const posted = new Date(iso)
  const age = Math.max(0, now - posted.getTime())
  if (age < MINUTE) return `${Math.floor(age / SECOND)}s`
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`
  if (age < DAY) return `${Math.floor(age / HOUR)}h`
  return posted.getUTCFullYear() === new Date(now).getUTCFullYear()
    ? monthDay.format(posted)
    : monthDayYear.format(posted)
}
