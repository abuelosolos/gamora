"use client"

import * as React from "react"
import { ArrowUpLeft, MagnifyingGlass } from "@/components/icons"
import { PersonRowSkeleton } from "@/components/search/person-row"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PersonResult } from "@/server/services/search"

/**
 * The popup under the search box while you type: "Search for <text>", your own
 * matching recent searches (the arrow puts one in the box without searching),
 * and the people who match. No Figma frame exists for it; it is built from the
 * Search screen's own rows (avatar + name + @username, caption text) on the
 * theme's bgDefault with a borderDefault line.
 *
 * It is the listbox of a combobox: the search field keeps focus, the active row
 * is announced through aria-activedescendant, and pressing a row with the mouse
 * does not move focus away from the field (see onMouseDown on the panel).
 */
export type SuggestionRow =
  | { kind: "search"; text: string }
  | { kind: "text"; text: string }
  | { kind: "person"; person: PersonResult }

export const SUGGESTION_TEXT_MAX = 3
export const SUGGESTION_PEOPLE_MAX = 5

export function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`
}

export interface SearchSuggestionsProps {
  /** Id of the listbox (the field's aria-controls). */
  id: string
  rows: SuggestionRow[]
  activeIndex: number
  /** State of the people lookup that follows the text rows. */
  status: "loading" | "done" | "error"
  errorMessage?: string
  text: string
  onChoose: (row: SuggestionRow) => void
  onFill: (text: string) => void
  onRetry: () => void
}

const optionClass =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-bgSurface"

function SearchSuggestions({
  id,
  rows,
  activeIndex,
  status,
  errorMessage,
  text,
  onChoose,
  onFill,
  onRetry,
}: SearchSuggestionsProps) {
  const hasPeople = rows.some((row) => row.kind === "person")

  return (
    <div
      // Keep focus in the search field when a row (or Try again) is pressed.
      onMouseDown={(event) => event.preventDefault()}
      className="absolute inset-x-0 top-full z-20 max-h-96 overflow-y-auto border-b border-borderDefault bg-bgDefault pb-2.5"
    >
      <ul role="listbox" id={id} aria-label="Search suggestions" className="flex flex-col">
        {rows.map((row, index) => {
          const active = index === activeIndex
          const common = {
            id: optionId(id, index),
            role: "option" as const,
            "aria-selected": active,
            onClick: () => onChoose(row),
          }
          if (row.kind === "search") {
            return (
              <li key="search" {...common} className={cn(optionClass, active && "bg-bgSurface")}>
                <MagnifyingGlass aria-hidden="true" className="size-5 shrink-0 text-textSecondary" />
                <span className="min-w-0 flex-1 truncate text-body-sm text-textPrimary">
                  Search for <span className="font-medium">&ldquo;{row.text}&rdquo;</span>
                </span>
              </li>
            )
          }
          if (row.kind === "text") {
            return (
              <li key={`text-${row.text}`} {...common} className={cn(optionClass, active && "bg-bgSurface")}>
                <span className="min-w-0 flex-1 truncate text-caption text-textPrimary">{row.text}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Put ${row.text} in the search box`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onFill(row.text)
                  }}
                  className="-mr-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-textSecondary outline-none hover:text-textPrimary"
                >
                  <ArrowUpLeft aria-hidden="true" className="size-6" />
                </button>
              </li>
            )
          }
          const { person } = row
          return (
            <li key={`person-${person.username}`} {...common} className={cn(optionClass, "min-h-14", active && "bg-bgSurface")}>
              <Avatar src={person.avatarUrl} name={person.name} size="md" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm font-medium text-textPrimary">{person.name}</span>
                <span className="truncate text-caption text-textSecondary">@{person.username}</span>
              </span>
            </li>
          )
        })}
      </ul>

      {status === "loading" ? (
        <ul role="status" aria-label="Searching" className="flex flex-col">
          <PersonRowSkeleton />
          <PersonRowSkeleton />
          <PersonRowSkeleton />
        </ul>
      ) : status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-2 px-5 py-2.5">
          <p className="text-body-sm text-textSecondary">{errorMessage ?? "Could not search. Try again."}</p>
          <Button size="sm" variant="outline-accent" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : !hasPeople ? (
        <p className="px-5 py-2.5 text-body-sm text-textSecondary">No artists match &ldquo;{text}&rdquo;.</p>
      ) : null}
    </div>
  )
}

export { SearchSuggestions }
