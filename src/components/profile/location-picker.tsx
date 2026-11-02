"use client"

import * as React from "react"
import { CheckCircle } from "@/components/icons"
import { LineInput } from "@/components/ui/line-field"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { locationLabel, locationOptions } from "@/lib/locations"
import { cn } from "@/lib/utils"

/**
 * Figma: "Location" ("Remote" / "Choose Location"). A line that opens a bottom
 * sheet with a search box and the list: Remote first, then countries A to Z.
 * The value is "remote" or a country code, never typed text.
 */
export interface LocationPickerProps {
  id: string
  value: string | null
  onChange: (value: string | null) => void
}

function LocationPicker({ id, value, onChange }: LocationPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const options = React.useMemo(() => locationOptions(), [])

  const needle = query.trim().toLowerCase()
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options

  function choose(next: string | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          id={id}
          className={cn(
            "flex min-h-11 w-full items-center border-b border-borderStrong text-left text-caption outline-none focus-visible:border-b-2 focus-visible:border-accentDefault",
            value ? "text-textPrimary" : "text-textSecondary"
          )}
        >
          {value ? locationLabel(value) : "Choose Location"}
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Location</SheetTitle>
          <SheetDescription>Where you work from. Choose Remote if it does not matter.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-5">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search locations
          </label>
          <LineInput
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            autoComplete="off"
          />
          <ul className="max-h-80 overflow-y-auto pb-2">
            {visible.map((option) => {
              const selected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => choose(option.value)}
                    aria-pressed={selected}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-ui-sm text-left text-body text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
                  >
                    {option.label}
                    {selected ? <CheckCircle aria-hidden="true" className="size-5 text-accentDefault" /> : null}
                  </button>
                </li>
              )
            })}
            {visible.length === 0 ? (
              <li className="py-4 text-center text-body-sm text-textSecondary">No matches.</li>
            ) : null}
          </ul>
          {value ? (
            <button
              type="button"
              onClick={() => choose(null)}
              className="min-h-11 rounded-ui-sm text-left text-body-sm text-textSecondary outline-none hover:text-textPrimary focus-visible:ring-2 focus-visible:ring-accentDefault"
            >
              Clear location
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { LocationPicker }
