import Link from "next/link"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * One person in the results: avatar, display name, @username and their
 * categories. The whole row is the link to their profile (44px+ target).
 */
export interface PersonRowProps {
  username: string
  name: string
  avatarUrl: string | null
  categories: string[]
  onOpen?: () => void
}

function PersonRow({ username, name, avatarUrl, categories, onOpen }: PersonRowProps) {
  return (
    <li>
      <Link
        href={`/u/${username}`}
        onClick={onOpen}
        className="flex min-h-14 items-center gap-3 px-5 py-2.5 outline-none transition-colors hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
      >
        <Avatar src={avatarUrl} name={name} size="md" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-medium text-textPrimary">{name}</span>
          <span className="truncate text-caption text-textSecondary">
            @{username}
            {categories.length > 0 ? ` · ${categories.join(", ")}` : ""}
          </span>
        </span>
      </Link>
    </li>
  )
}

function PersonRowSkeleton() {
  return (
    <li className="flex min-h-14 items-center gap-3 px-5 py-2.5">
      <Skeleton className="size-10 rounded-full" />
      <span className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </span>
    </li>
  )
}

export { PersonRow, PersonRowSkeleton }
