const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
]

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" })

/**
 * "12 hours ago", as on the Activity screen. It depends on the current time,
 * so render it inside an element with suppressHydrationWarning: the server and
 * the browser can be a few seconds apart.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const elapsed = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (elapsed < 60) return "Just now"
  for (const { unit, seconds } of units) {
    if (elapsed >= seconds) return formatter.format(-Math.floor(elapsed / seconds), unit)
  }
  return "Just now"
}
