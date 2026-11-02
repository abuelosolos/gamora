"use client"

import * as React from "react"
import { CalendarDots } from "@/components/icons"
import { EARLIEST_BIRTH_DATE, formatBirthday, latestBirthday } from "@/lib/birthday"
import { cn } from "@/lib/utils"

/**
 * Figma: "Date of birth". A calendar icon and the date on a line ("December 10,
 * 2006", or "Set birthday" when empty). Pressing the icon or the date opens the
 * device's own date picker: a native <input type="date"> kept invisible under
 * the row and opened with showPicker(). Where showPicker is not supported the
 * input is focused and clicked instead.
 *
 * The picker is limited to dates that pass the server rule (1900 to 13 years
 * ago); the server checks again.
 */
export interface BirthdayFieldProps {
  id: string
  /** "YYYY-MM-DD" or null. */
  value: string | null
  onChange: (value: string | null) => void
  error?: string | null
}

function BirthdayField({ id, value, onChange, error }: BirthdayFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [max] = React.useState(() => latestBirthday())
  const messageId = `${id}-message`

  function openPicker() {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "relative flex min-h-11 items-center gap-2.5 border-b border-borderStrong focus-within:border-b-2 focus-within:border-accentDefault",
          error && "border-statusError"
        )}
      >
        <button
          type="button"
          onClick={openPicker}
          aria-label="Open calendar"
          className="flex size-11 shrink-0 items-center justify-center rounded-ui-sm text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
        >
          <CalendarDots aria-hidden="true" className="size-6" />
        </button>
        <button
          type="button"
          id={id}
          onClick={openPicker}
          aria-describedby={error ? messageId : undefined}
          className={cn(
            "min-h-11 flex-1 rounded-ui-sm text-left text-caption outline-none focus-visible:ring-2 focus-visible:ring-accentDefault",
            value ? "text-textPrimary" : "text-textSecondary"
          )}
        >
          {value ? formatBirthday(value) : "Set birthday"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 rounded-ui-sm px-2.5 text-caption text-textSecondary outline-none hover:text-textPrimary focus-visible:ring-2 focus-visible:ring-accentDefault"
          >
            Clear
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="date"
          value={value ?? ""}
          min={EARLIEST_BIRTH_DATE}
          max={max}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full opacity-0"
        />
      </div>
      {error ? (
        <p id={messageId} role="alert" className="pt-1 text-caption text-statusError">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { BirthdayField }
