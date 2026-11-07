"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"

/**
 * Keeps active users signed in. Page renders cannot write cookies, so Better
 * Auth never extends the session there. One get-session call per page load
 * goes through the /api/auth route handler, which can, so the expiry slides
 * forward (at most once a day, see `updateAge`). Without a session cookie the
 * server answers null without touching the database. Renders nothing.
 */
export function SessionKeepAlive() {
  React.useEffect(() => {
    authClient.getSession().catch(() => undefined)
  }, [])
  return null
}
