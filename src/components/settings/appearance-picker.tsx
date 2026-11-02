"use client"

import { CheckCircle } from "@/components/icons"
import { useTheme } from "@/components/shared/theme-provider"
import { THEMES, type Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/**
 * Appearance picker: five cards, one per theme, as one radio group (real radio
 * inputs, so arrow keys and screen readers work). Each card is a small mock
 * screen drawn with that theme's own tokens: data-theme on the preview makes
 * every token inside it resolve to that theme, so nothing here is a hard-coded
 * color and the preview can never drift from the real theme.
 *
 * Choosing a card calls setTheme, which changes data-theme on <html> straight
 * away and stores the choice in the gamora-theme cookie (the server renders the
 * next page already in that theme). There is no Figma frame for this screen, so
 * it is composed from existing tokens and the Settings frame's card style.
 */
const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  black: "Black",
  blue: "Blue",
  cream: "Cream",
}

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      data-theme={theme}
      aria-hidden="true"
      className="flex h-24 flex-col gap-2 rounded-ui-sm border border-borderDefault bg-bgDefault p-2"
    >
      <div className="flex items-center gap-1">
        <span className="size-3 rounded-full bg-accentDefault" />
        <span className="h-1 w-8 rounded-full bg-textPrimary" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 rounded-ui-sm bg-bgSurface px-2">
        <span className="h-1 w-full rounded-full bg-textSecondary" />
        <span className="h-1 w-2/3 rounded-full bg-textDisabled" />
      </div>
      <span className="h-3 w-10 rounded-full bg-accentDefault" />
    </div>
  )
}

function AppearancePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset className="px-5 py-2.5">
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((value) => {
          const selected = theme === value
          return (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer flex-col gap-2 rounded-ui-md border bg-bgDefault p-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accentDefault",
                selected ? "border-accentDefault" : "border-borderDefault hover:bg-bgSurface"
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={selected}
                onChange={() => setTheme(value)}
                className="sr-only"
              />
              <ThemePreview theme={value} />
              <span className="flex min-h-6 items-center justify-between px-1 text-body-sm font-medium text-textPrimary">
                {THEME_LABELS[value]}
                {selected ? (
                  <CheckCircle aria-hidden="true" className="size-5 text-accentDefault" />
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export { AppearancePicker }
