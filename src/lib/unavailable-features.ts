/**
 * Features that are not built yet. The Coming soon page at
 * /unavailable/[feature] only answers for slugs in this list; any other slug is
 * a 404, so the URL cannot be used to put arbitrary text on the page.
 */
export const UNAVAILABLE_FEATURES = {
  chat: { name: "Messages" },
  settings: { name: "Settings" },
  themes: { name: "Themes" },
  wallet: { name: "Wallet" },
  report: { name: "Reporting" },
  subscriptions: { name: "Subscriptions", description: "Subscribing to artists to see their subscriber-only posts is on the way." },
} as const satisfies Record<string, { name: string; description?: string }>

export type UnavailableFeature = keyof typeof UNAVAILABLE_FEATURES

export function isUnavailableFeature(value: string): value is UnavailableFeature {
  return Object.hasOwn(UNAVAILABLE_FEATURES, value)
}
