import * as React from "react"
import { MagnifyingGlass, XCircleFill } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Figma: the search pill on the Search screen (318px, borderDefault fill, 10px
 * padding, MagnifyingGlass 20px, bodySmall 13/18 text). A real <form
 * role="search"> around a type="search" input, so Enter submits and the
 * keyboard shows a search key. The clear button appears once there is text.
 */
export interface SearchFieldProps extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  inputRef?: React.Ref<HTMLInputElement>
}

function SearchField({ value, onValueChange, onSubmit, onClear, inputRef, className, ...props }: SearchFieldProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-full bg-borderDefault px-2.5 focus-within:ring-2 focus-within:ring-accentDefault",
        className
      )}
    >
      <MagnifyingGlass aria-hidden="true" className="size-5 shrink-0 text-textSecondary" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent py-2.5 text-body-sm text-textPrimary outline-none placeholder:text-textSecondary [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-textSecondary outline-none hover:text-textPrimary focus-visible:ring-2 focus-visible:ring-accentDefault"
        >
          <XCircleFill aria-hidden="true" className="size-5" />
        </button>
      ) : null}
    </form>
  )
}

export { SearchField }
