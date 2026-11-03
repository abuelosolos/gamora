import Link from "next/link"
import { ArrowUpLeft } from "@/components/icons"
import { ClearHistoryDialog } from "@/components/search/clear-history-dialog"
import { Avatar } from "@/components/ui/avatar"
import type { RecentSearches } from "@/server/services/search"

/**
 * Figma: "Recent" (caption, with the clear-all button on the right), a
 * sideways row of people you opened (avatar + @username, 20px apart), then a
 * list of text searches, each with an ArrowUpLeft that puts the text back in
 * the search box. Renders nothing when there is no history.
 */
export interface RecentSearchesProps {
  history: RecentSearches
  onPickQuery: (query: string) => void
  onOpenPerson: (username: string) => void
  onCleared: () => void
}

function RecentSearchesList({ history, onPickQuery, onOpenPerson, onCleared }: RecentSearchesProps) {
  if (history.people.length === 0 && history.queries.length === 0) return null

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col">
      <div className="flex items-center justify-between pr-4 pl-5">
        <h2 id="recent-heading" className="text-caption text-textPrimary">
          Recent
        </h2>
        <ClearHistoryDialog onCleared={onCleared} />
      </div>

      {history.people.length > 0 ? (
        <ul className="flex gap-5 overflow-x-auto px-5 py-2.5 [scrollbar-width:none]">
          {history.people.map((person) => (
            <li key={person.username} className="shrink-0">
              <Link
                href={`/u/${person.username}`}
                onClick={() => onOpenPerson(person.username)}
                className="flex min-h-11 flex-col items-center gap-1.5 rounded-ui-sm outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
              >
                <Avatar src={person.avatarUrl} name={person.name} size="md" />
                <span className="max-w-24 truncate text-caption text-textSecondary">@{person.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {history.queries.length > 0 ? (
        <ul className="flex flex-col">
          {history.queries.map((query) => (
            <li key={query}>
              <button
                type="button"
                onClick={() => onPickQuery(query)}
                aria-label={`Search again for ${query}`}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-caption text-textPrimary outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
              >
                <span className="truncate">{query}</span>
                <ArrowUpLeft aria-hidden="true" className="size-6 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export { RecentSearchesList }
