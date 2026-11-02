const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })

/**
 * "Nov 2". Pinned to UTC so the server and the browser print the same text
 * (no hydration mismatch). The exact time is in the <time> element's dateTime.
 */
export function formatPostDate(iso: string): string {
  return formatter.format(new Date(iso))
}
