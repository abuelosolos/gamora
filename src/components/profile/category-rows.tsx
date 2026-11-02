"use client"

import * as React from "react"
import { Plus, XCircleFill } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { LineInput } from "@/components/ui/line-field"
import { CATEGORY_MAX, CATEGORY_NAME_MAX } from "@/server/validators/profile"

/**
 * Figma: "Category". The art categories the artist makes up (they show on the
 * profile as "Semi-Realism +1"), not the interests picked at sign-up. Each one is
 * a typed line with a remove button; "Add Category" adds another empty line, up
 * to four. Empty lines are ignored when saving.
 *
 * `rows` is the raw text of every line, `errors` the message for each line (the
 * form decides what is valid). An error only shows once the line has lost focus,
 * so typing "a" does not flash "at least 2 characters".
 */
export interface CategoryRowsProps {
  idPrefix: string
  rows: string[]
  errors: (string | null)[]
  onChange: (rows: string[]) => void
}

function CategoryRows({ idPrefix, rows, errors, onChange }: CategoryRowsProps) {
  const filled = rows.filter((row) => row.trim() !== "").length
  const [focused, setFocused] = React.useState<number | null>(null)
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const focusAfterAdd = React.useRef(false)

  React.useEffect(() => {
    if (!focusAfterAdd.current) return
    focusAfterAdd.current = false
    refs.current[rows.length - 1]?.focus()
  }, [rows.length])

  function add() {
    const lastEmpty = rows.length > 0 && rows[rows.length - 1]!.trim() === ""
    if (lastEmpty) {
      refs.current[rows.length - 1]?.focus()
      return
    }
    focusAfterAdd.current = true
    onChange([...rows, ""])
  }

  const label = filled === 0 ? `Category (Can only choose ${CATEGORY_MAX})` : `Category (${filled} of ${CATEGORY_MAX})`

  return (
    <fieldset className="flex flex-col">
      <legend className="pb-1 text-caption text-textSecondary">{label}</legend>
      {rows.map((row, index) => {
        const error = focused === index ? null : errors[index]
        const inputId = `${idPrefix}-${index}`
        return (
          <div key={index} className="flex flex-col">
            <div className="flex items-center gap-1">
              <label htmlFor={inputId} className="sr-only">
                Category {index + 1}
              </label>
              <LineInput
                id={inputId}
                ref={(node) => {
                  refs.current[index] = node
                }}
                value={row}
                maxLength={CATEGORY_NAME_MAX}
                onChange={(event) => onChange(rows.map((current, i) => (i === index ? event.target.value : current)))}
                onFocus={() => setFocused(index)}
                onBlur={() => setFocused((current) => (current === index ? null : current))}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-message` : undefined}
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                aria-label={`Remove category ${row.trim() || index + 1}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-textSecondary outline-none hover:text-textPrimary focus-visible:ring-2 focus-visible:ring-accentDefault"
              >
                <XCircleFill aria-hidden="true" className="size-6" />
              </button>
            </div>
            {error ? (
              <p id={`${inputId}-message`} role="alert" className="pt-1 text-caption text-statusError">
                {error}
              </p>
            ) : null}
          </div>
        )
      })}
      {rows.length < CATEGORY_MAX ? (
        <Button type="button" variant="ghost" size="sm" onClick={add} className="mt-1 self-center text-caption">
          <Plus aria-hidden="true" className="size-6" />
          Add Category
        </Button>
      ) : null}
    </fieldset>
  )
}

export { CategoryRows }
