import { Suspense } from "react"
import { SearchScreen } from "@/components/search/search-screen"
import { SearchSkeleton } from "@/components/search/search-skeleton"
import { requireUser } from "@/server/auth/session"
import { listHistory, listPopularCategories } from "@/server/services/search"
import { searchCategorySchema, searchQuerySchema } from "@/server/validators/search"

// Private: the (private) layout already requires a session and a profile.
// Figma: Search (15:984) and its Clear history popup (108:4523). The text and
// category are read from the URL, so everything sits inside Suspense.
export const metadata = { title: "Search" }

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  )
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

async function SearchContent({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams
  const query = searchQuerySchema.safeParse(first(params.q))
  const category = searchCategorySchema.safeParse(first(params.category))

  const viewer = await requireUser()
  const [history, categories] = await Promise.all([listHistory(viewer.id), listPopularCategories()])

  // A category in the URL that no pill shows still has to be a pill, so it can be turned off.
  const pills =
    category.success && !categories.some((name) => name.toLowerCase() === category.data.toLowerCase())
      ? [category.data, ...categories]
      : categories

  return (
    <SearchScreen
      initialQuery={query.success ? query.data : ""}
      initialCategory={category.success ? category.data : null}
      categories={pills}
      initialHistory={history}
    />
  )
}
