"use client"

import * as React from "react"
import { UNREAD_CHANGED_EVENT } from "@/components/layout/use-unread-count"
import { markNotificationsReadAction } from "@/server/actions/interactions"

/**
 * Remembers which notifications were new when the Activity page was opened, so
 * they stay highlighted while the viewer is here, through a pull-to-refresh or a
 * filter change. Everything is marked read when they leave the page (or hide the
 * tab); the highlights go away with this component, and the bell badge asks the
 * server again.
 */
interface Highlights {
  ids: ReadonlySet<string>
  remember: (ids: string[]) => void
}

const HighlightsContext = React.createContext<Highlights>({ ids: new Set(), remember: () => {} })

function useActivityHighlights(): Highlights {
  return React.useContext(HighlightsContext)
}

function ActivityHighlights({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = React.useState<ReadonlySet<string>>(() => new Set())
  const dirty = React.useRef(false)

  const remember = React.useCallback((fresh: string[]) => {
    if (fresh.length === 0) return
    dirty.current = true
    setIds((current) => (fresh.every((id) => current.has(id)) ? current : new Set([...current, ...fresh])))
  }, [])

  React.useEffect(() => {
    async function markRead() {
      if (!dirty.current) return
      dirty.current = false
      await markNotificationsReadAction()
      window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT))
    }
    const onHidden = () => {
      if (document.hidden) void markRead()
    }
    document.addEventListener("visibilitychange", onHidden)
    return () => {
      document.removeEventListener("visibilitychange", onHidden)
      void markRead()
    }
  }, [])

  const value = React.useMemo(() => ({ ids, remember }), [ids, remember])
  return <HighlightsContext.Provider value={value}>{children}</HighlightsContext.Provider>
}

export { ActivityHighlights, useActivityHighlights }
