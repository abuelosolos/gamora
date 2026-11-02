"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Figma: the category on the right of the profile head ("Semi-Realism" and a
 * "+1" pill) with the rest in a dropdown. These are the art categories the
 * artist created in Edit profile, not the interests picked at sign-up. With one
 * category there is no pill and no menu.
 */
export interface ProfileCategoriesProps {
  categories: string[]
}

function ProfileCategories({ categories }: ProfileCategoriesProps) {
  const [first, ...rest] = categories
  if (!first) return null

  return (
    <div className="flex shrink-0 items-center gap-1 text-caption text-textSecondary">
      <span className="max-w-28 truncate">{first}</span>
      {rest.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Show all ${categories.length} categories`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
          >
            <span className="rounded-full bg-accentDefault px-2.5 py-1 text-caption text-textOnAccent">
              +{rest.length}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuGroup aria-label="Categories">
              {categories.map((category) => (
                <DropdownMenuLabel key={category} className="px-2.5 py-2 text-caption text-textSecondary">
                  {category}
                </DropdownMenuLabel>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

export { ProfileCategories }
