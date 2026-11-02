/**
 * Where an artist works from. The profile stores "remote" or an ISO 3166-1
 * alpha-2 country code, never free text, so the value can only ever be one of
 * the entries below. Names are produced by Intl.DisplayNames (no dependency),
 * always in English so the server and the browser print the same text.
 *
 * Left out on purpose: uninhabited or non-country codes (AQ, BV, GS, HM, TF, UM).
 */
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const

export const REMOTE = "remote"

const codeSet: ReadonlySet<string> = new Set(COUNTRY_CODES)

export function isLocation(value: unknown): value is string {
  return typeof value === "string" && (value === REMOTE || codeSet.has(value))
}

let names: Intl.DisplayNames | null | undefined

/** "Remote", or the English country name. Falls back to the code if names are unavailable. */
export function locationLabel(value: string): string {
  if (value === REMOTE) return "Remote"
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" })
    } catch {
      names = null
    }
  }
  try {
    return names?.of(value) ?? value
  } catch {
    return value
  }
}

export interface LocationOption {
  value: string
  label: string
}

/** "Remote" first, then countries A to Z. */
export function locationOptions(): LocationOption[] {
  const countries = COUNTRY_CODES.map((code) => ({ value: code as string, label: locationLabel(code) })).sort((a, b) =>
    a.label.localeCompare(b.label, "en")
  )
  return [{ value: REMOTE, label: "Remote" }, ...countries]
}
