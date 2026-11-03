"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CaretLeft, MagnifyingGlass } from "@/components/icons"
import { TopBarButton } from "@/components/layout/top-bar"
import { PersonRow, PersonRowSkeleton } from "@/components/search/person-row"
import { RecentSearchesList } from "@/components/search/recent-searches"
import { SearchField } from "@/components/search/search-field"
import {
  optionId,
  SearchSuggestions,
  SUGGESTION_PEOPLE_MAX,
  SUGGESTION_TEXT_MAX,
  type SuggestionRow,
} from "@/components/search/search-suggestions"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { recordSearchAction, searchPeopleAction } from "@/server/actions/search"
import type { PersonResult, RecentSearches } from "@/server/services/search"
import { SEARCH_HISTORY_MAX, SEARCH_QUERY_MAX } from "@/server/validators/search"

/**
 * Figma: Search. Back + search pill, category pills, then either Recent or
 * the people who match. A category and a committed text search live in the URL
 * (?q=&category=) so a reload or the back button keeps them.
 *
 * Typing opens a suggestions popup under the box (SearchSuggestions): "Search
 * for ...", matching recent searches and matching people, found after a 250 ms
 * pause with no Enter needed. A search is "committed" (popup closes, the full
 * results page shows) by Enter, "Search for ...", a Recent row, a suggestion
 * row or a category pill; editing the text un-commits it. The arrow beside a
 * recent or suggested text only puts it in the box.
 *
 * Each answer carries the search it belongs to and only the current one is
 * shown, so a slow reply can never replace a newer one. A search is remembered
 * in Recent when it is committed and a person when their row is opened; both are
 * saved by the server for the signed-in viewer and failures there are ignored
 * (history is a convenience).
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

/** The text that is searched: trimmed, without a leading @. */
function normalize(value: string): string {
  return value.trim().replace(/^@+/, "").trim()
}

function SearchScreen({ initialQuery, initialCategory, categories, initialHistory }: SearchScreenProps) {
  const router = useRouter()
  const listId = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState(initialQuery)
  const [category, setCategory] = React.useState<string | null>(initialCategory)
  const [answer, setAnswer] = React.useState<Answer | null>(null)
  const [history, setHistory] = React.useState(initialHistory)
  const [retry, setRetry] = React.useState(0)
  const [committed, setCommitted] = React.useState(Boolean(initialQuery || initialCategory))
  const [focused, setFocused] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)

  React.useEffect(() => {
    if (!initialQuery && !initialCategory) inputRef.current?.focus()
  }, [initialQuery, initialCategory])

  // Keep the URL in step with the box. history.replaceState does not ask the
  // server for the page again (router.replace would, on every keystroke).
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (committed && query.trim()) params.set("q", query.trim())
    if (category) params.set("category", category)
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search")
  }, [query, category, committed])

  const text = normalize(query)
  const key = `${text}|${category ?? ""}|${retry}`
  const typed = text.length > 0 || category !== null
  const popupOpen = focused && !committed && !dismissed && text.length > 0
  const showResults = committed && typed
  const results: Outcome | { status: "loading" } = answer && answer.key === key ? answer : { status: "loading" }

  // The rows of the popup: the search itself, matching recent searches, matching people.
  const rows: SuggestionRow[] = (() => {
    if (!popupOpen) return []
    const lowered = text.toLowerCase()
    const recents = history.queries
      .filter((item) => item.toLowerCase().includes(lowered) && item.toLowerCase() !== lowered)
      .slice(0, SUGGESTION_TEXT_MAX)
    const people = results.status === "done" ? results.people.slice(0, SUGGESTION_PEOPLE_MAX) : []
    return [
      { kind: "search", text },
      ...recents.map((item) => ({ kind: "text" as const, text: item })),
      ...people.map((person) => ({ kind: "person" as const, person })),
    ]
  })()
  const active = activeIndex < rows.length ? activeIndex : -1

  // Search after a pause. The answer is stored with the key of the search it
  // answers, so a reply for older text is never shown (and never needs a reset).
  // It runs for the popup and for the results page alike, so Enter shows the answer at once.
  const searching = typed && (committed || popupOpen)
  React.useEffect(() => {
    if (!searching) return
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
  }, [searching, text, category, key])

  function rememberQuery(term: string) {
    if (!term) return
    setHistory((current) => ({
      ...current,
      queries: [term, ...current.queries.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(
        0,
        SEARCH_HISTORY_MAX
      ),
    }))
    void recordSearchAction({ kind: "query", query: term }).catch(() => undefined)
  }

  /** Put text in the box without searching; the suggestions popup follows it. */
  function fillQuery(value: string) {
    setQuery(value.slice(0, SEARCH_QUERY_MAX + 1))
    setCommitted(false)
    setDismissed(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  /** Search for this text: close the popup, show the results page, remember it. */
  function searchFor(value: string) {
    const term = normalize(value)
    setQuery(value.slice(0, SEARCH_QUERY_MAX + 1))
    if (!term) return
    setCommitted(true)
    setActiveIndex(-1)
    rememberQuery(term)
    inputRef.current?.blur()
  }

  function choose(row: SuggestionRow) {
    if (row.kind === "person") {
      rememberPerson(row.person.username)
      router.push(`/u/${row.person.username}`)
    } else {
      searchFor(row.text)
    }
  }

  function submit() {
    const row = active >= 0 ? rows[active] : undefined
    if (popupOpen && row) choose(row)
    else if (text) searchFor(text)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!popupOpen) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex(active < 0 ? 0 : (active + 1) % rows.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(active <= 0 ? rows.length - 1 : active - 1)
    } else if (event.key === "Escape") {
      event.preventDefault()
      setDismissed(true)
      setActiveIndex(-1)
    } else if (event.key === "ArrowRight") {
      // Like accepting a suggestion: only when the caret is at the end of the text.
      const row = active >= 0 ? rows[active] : undefined
      const input = event.currentTarget
      if (row?.kind === "text" && input.selectionStart === input.value.length) {
        event.preventDefault()
        fillQuery(row.text)
      }
    }
  }

  function rememberPerson(username: string) {
    void recordSearchAction({ kind: "profile", username }).catch(() => undefined)
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative flex items-center gap-2.5 px-5 py-2.5">
        <TopBarButton label="Back" asChild>
          <Link href="/feed">
            <CaretLeft aria-hidden="true" className="size-6" />
          </Link>
        </TopBarButton>
        <SearchField
          inputRef={inputRef}
          value={query}
          onValueChange={(value) => {
            setQuery(value.slice(0, SEARCH_QUERY_MAX + 1))
            setCommitted(false)
            setDismissed(false)
            setActiveIndex(-1)
          }}
          onSubmit={submit}
          onClear={() => {
            setQuery("")
            setCommitted(false)
            inputRef.current?.focus()
          }}
          placeholder="Search artists…"
          aria-label="Search artists by name or username"
          maxLength={SEARCH_QUERY_MAX}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={popupOpen}
          aria-controls={popupOpen ? listId : undefined}
          aria-activedescendant={popupOpen && active >= 0 ? optionId(listId, active) : undefined}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
        />
        {popupOpen ? (
          <SearchSuggestions
            id={listId}
            rows={rows}
            activeIndex={active}
            status={results.status}
            errorMessage={results.status === "error" ? results.message : undefined}
            text={text}
            onChoose={choose}
            onFill={fillQuery}
            onRetry={() => setRetry((n) => n + 1)}
          />
        ) : null}
      </div>

      {categories.length > 0 ? (
        <ul aria-label="Art categories" className="flex gap-3.5 overflow-x-auto px-5 py-2.5 [scrollbar-width:none]">
          {categories.map((name) => (
            <li key={name} className="shrink-0">
              <Chip
                selected={category?.toLowerCase() === name.toLowerCase()}
                onClick={() => {
                  setCategory((current) => (current?.toLowerCase() === name.toLowerCase() ? null : name))
                  setCommitted(true)
                }}
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

      {!showResults ? (
        <RecentSearchesList
          history={history}
          onSearchQuery={searchFor}
          onFillQuery={fillQuery}
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
