"use client"

import * as React from "react"
import Link from "next/link"
import { CaretLeft, MagnifyingGlass } from "@/components/icons"
import { TopBarButton } from "@/components/layout/top-bar"
import { PersonRow, PersonRowSkeleton } from "@/components/search/person-row"
import { RecentSearchesList } from "@/components/search/recent-searches"
import { SearchField } from "@/components/search/search-field"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { recordSearchAction, searchPeopleAction } from "@/server/actions/search"
import type { PersonResult, RecentSearches } from "@/server/services/search"
import { SEARCH_HISTORY_MAX, SEARCH_QUERY_MAX } from "@/server/validators/search"

/**
 * Figma: Search. Back + search pill, category pills, then either Recent
 * (nothing typed) or the people who match. The text and the chosen category live
 * in the URL (?q=&category=) so a reload or the back button keeps them.
 *
 * Typing searches after a 250 ms pause. Each answer carries the search it
 * belongs to and only the current one is shown, so a slow reply can never
 * replace a newer one.
 * A search is remembered in Recent when it is submitted (Enter) and a person
 * when their row is opened; both are saved by the server for the signed-in
 * viewer and failures there are ignored (history is a convenience).
 */
type Outcome = { status: "done"; people: PersonResult[] } | { status: "error"; message: string }
/** An answer and the search it belongs to; an answer for an older search counts as "still loading". */
type Answer = Outcome & { key: string }

export interface SearchScreenProps {
  initialQuery: string
  initialCategory: string | null
  categories: string[]
  initialHistory: RecentSearches
}

function SearchScreen({ initialQuery, initialCategory, categories, initialHistory }: SearchScreenProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState(initialQuery)
  const [category, setCategory] = React.useState<string | null>(initialCategory)
  const [answer, setAnswer] = React.useState<Answer | null>(null)
  const [history, setHistory] = React.useState(initialHistory)
  const [retry, setRetry] = React.useState(0)

  React.useEffect(() => {
    if (!initialQuery && !initialCategory) inputRef.current?.focus()
  }, [initialQuery, initialCategory])

  // Keep the URL in step with the box. history.replaceState does not ask the
  // server for the page again (router.replace would, on every keystroke).
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (category) params.set("category", category)
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search")
  }, [query, category])

  const text = query.trim().replace(/^@+/, "").trim()
  const key = `${text}|${category ?? ""}|${retry}`
  const typed = text.length > 0 || category !== null
  const results: Outcome | { status: "loading" } = answer && answer.key === key ? answer : { status: "loading" }

  // Search after a pause. The answer is stored with the key of the search it
  // answers, so a reply for older text is never shown (and never needs a reset).
  React.useEffect(() => {
    if (!typed) return
    let current = true
    const timer = setTimeout(async () => {
      let outcome: Outcome
      try {
        const result = await searchPeopleAction({
          ...(text ? { query: text } : {}),
          ...(category ? { category } : {}),
        })
        outcome = result.ok ? { status: "done", people: result.people } : { status: "error", message: result.message }
      } catch {
        outcome = { status: "error", message: "Could not search. Check your connection and try again." }
      }
      if (current) setAnswer({ ...outcome, key })
    }, 250)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [typed, text, category, key])

  function rememberQuery() {
    if (!text) return
    setHistory((current) => ({
      ...current,
      queries: [text, ...current.queries.filter((item) => item.toLowerCase() !== text.toLowerCase())].slice(
        0,
        SEARCH_HISTORY_MAX
      ),
    }))
    void recordSearchAction({ kind: "query", query: text }).catch(() => undefined)
  }

  function rememberPerson(username: string) {
    void recordSearchAction({ kind: "profile", username }).catch(() => undefined)
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center gap-2.5 px-5 py-2.5">
        <TopBarButton label="Back" asChild>
          <Link href="/feed">
            <CaretLeft aria-hidden="true" className="size-6" />
          </Link>
        </TopBarButton>
        <SearchField
          inputRef={inputRef}
          value={query}
          onValueChange={(value) => setQuery(value.slice(0, SEARCH_QUERY_MAX + 1))}
          onSubmit={rememberQuery}
          onClear={() => {
            setQuery("")
            inputRef.current?.focus()
          }}
          placeholder="Search artists…"
          aria-label="Search artists by name or username"
          maxLength={SEARCH_QUERY_MAX}
        />
      </div>

      {categories.length > 0 ? (
        <ul aria-label="Art categories" className="flex gap-3.5 overflow-x-auto px-5 py-2.5 [scrollbar-width:none]">
          {categories.map((name) => (
            <li key={name} className="shrink-0">
              <Chip
                selected={category?.toLowerCase() === name.toLowerCase()}
                onClick={() => setCategory((current) => (current?.toLowerCase() === name.toLowerCase() ? null : name))}
              >
                {name}
              </Chip>
            </li>
          ))}
        </ul>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {results.status === "done"
          ? results.people.length === 0
            ? "No people found"
            : `${results.people.length} ${results.people.length === 1 ? "person" : "people"} found`
          : ""}
      </div>

      {!typed ? (
        <RecentSearchesList
          history={history}
          onPickQuery={(value) => setQuery(value)}
          onOpenPerson={rememberPerson}
          onCleared={() => setHistory({ people: [], queries: [] })}
        />
      ) : results.status === "error" ? (
        <EmptyState
          title="Search did not work"
          description={results.message}
          action={<Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>}
        />
      ) : results.status === "done" ? (
        results.people.length === 0 ? (
          <EmptyState
            icon={<MagnifyingGlass />}
            title="No artists found"
            description="Check the spelling, or try a name, a username or a different category."
          />
        ) : (
          <ul className="flex flex-col">
            {results.people.map((person) => (
              <PersonRow key={person.username} {...person} onOpen={() => rememberPerson(person.username)} />
            ))}
          </ul>
        )
      ) : (
        <ul role="status" aria-label="Searching" className="flex flex-col">
          <PersonRowSkeleton />
          <PersonRowSkeleton />
          <PersonRowSkeleton />
        </ul>
      )}
    </main>
  )
}

export { SearchScreen }
