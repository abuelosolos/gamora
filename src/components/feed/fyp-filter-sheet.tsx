"use client"

import * as React from "react"
import { PaintBrush } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { INTERESTS } from "@/lib/interests"

/**
 * Figma: "Home(FYP Dropdown)" and "Home(FYP Dropdown 2)". A bottom sheet that
 * slides up from the For you tab: handle, "Choose Gallery", the genres each
 * with a toggle, and a Reset button (grey and disabled until a genre is on,
 * accent when it can be pressed). Tapping outside, dragging the handle down or
 * Escape closes it. Changes apply at once, so the caller gets every change
 * through onChange and the feed behind refreshes.
 */
export interface FypFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: string[]
  onChange: (genres: string[]) => void
}

function FypFilterSheet({ open, onOpenChange, selected, onChange }: FypFilterSheetProps) {
  const chosen = new Set(selected)

  function toggle(name: string, on: boolean) {
    const next = on ? [...selected, name] : selected.filter((item) => item !== name)
    // Keep the onboarding order so the URL is the same however the toggles were pressed.
    onChange(INTERESTS.filter((item) => next.includes(item)))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[85dvh] pb-0">
        <SheetHeader className="items-center gap-0 pt-3 pb-2.5 text-center">
          <SheetTitle className="font-sans text-body font-medium">Choose Gallery</SheetTitle>
          <SheetDescription className="text-caption text-textSecondary">
            Choose genres to show on your feed
          </SheetDescription>
        </SheetHeader>

        <ul aria-label="Genres" className="min-h-0 flex-1 overflow-y-auto px-5">
          {INTERESTS.map((name) => {
            const id = `genre-${name.replace(/\s+/g, "-").toLowerCase()}`
            return (
              <li key={name} className="flex min-h-11 items-center gap-2.5 py-2.5">
                <PaintBrush aria-hidden="true" className="size-5 shrink-0 text-textPrimary" />
                <label htmlFor={id} className="min-w-0 flex-1 truncate text-caption text-textPrimary">
                  {name}
                </label>
                <Switch id={id} checked={chosen.has(name)} onCheckedChange={(on) => toggle(name, on)} />
              </li>
            )
          })}
        </ul>

        <div className="px-5 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
            className="w-full"
          >
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { FypFilterSheet }
