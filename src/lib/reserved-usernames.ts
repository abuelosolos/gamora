/**
 * Usernames nobody can register. They would collide with routes, impersonate
 * the product or staff, or read as system accounts. Compared after lowercasing.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // brand and staff
  "gamora", "official", "staff", "team", "admin", "administrator", "moderator",
  "mod", "support", "help", "security", "system", "root", "owner", "billing",
  // routes and app areas
  "api", "auth", "sign_in", "sign_up", "signin", "signup", "login", "logout",
  "register", "onboarding", "settings", "feed", "post", "posts", "create",
  "jobs", "job", "activity", "shop", "search", "notifications", "messages",
  "wallet", "report", "reports", "dev", "unavailable", "terms", "privacy",
  "about", "contact", "u", "user", "users", "me", "profile", "profiles",
  // roles
  "artist", "artists", "hirer", "hirers", "freelancer", "freelancers",
  // risky literals
  "null", "undefined", "true", "false", "www", "mail", "email", "anonymous",
  "deleted", "everyone", "all",
])

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.trim().toLowerCase())
}
