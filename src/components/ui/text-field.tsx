import * as React from "react"
import { CheckCircle } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Figma: Auth input. Caption label above a filled field (bgSurface, radius 16,
 * 46px), optional leading icon and trailing control, and a right-aligned caption
 * message under it ("This username is available" with a check).
 *
 * Built on Input. The label is a real <label>; the message is linked with
 * aria-describedby and errors set aria-invalid.
 */
export type TextFieldMessage = {
  tone: "hint" | "success" | "error"
  text: string
}

export interface TextFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  label: string
  /** Icon from src/components/icons, shown inside the field on the left. */
  leadingIcon?: React.ReactNode
  /** Control shown inside the field on the right (for example a show/hide button). */
  trailing?: React.ReactNode
  message?: TextFieldMessage | null
  id?: string
}

function TextField({
  label,
  leadingIcon,
  trailing,
  message,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generated = React.useId()
  const inputId = id ?? generated
  const messageId = `${inputId}-message`

  return (
    <div data-slot="text-field" className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="text-caption text-textSecondary">
        {label}
      </label>
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex items-center text-textSecondary [&_svg]:size-6"
          >
            {leadingIcon}
          </span>
        ) : null}
        <Input
          id={inputId}
          aria-invalid={message?.tone === "error" ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "border-transparent bg-bgSurface",
            leadingIcon && "pl-12",
            trailing && "pr-12"
          )}
          {...props}
        />
        {trailing ? <span className="absolute right-0 flex items-center">{trailing}</span> : null}
      </div>
      {message ? (
        <p
          id={messageId}
          role={message.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center justify-end gap-2 text-caption",
            message.tone === "error" && "text-statusError",
            message.tone === "success" && "text-statusSuccess",
            message.tone === "hint" && "text-textSecondary"
          )}
        >
          {message.text}
          {message.tone === "success" ? <CheckCircle className="size-4" aria-hidden="true" /> : null}
        </p>
      ) : null}
    </div>
  )
}

export { TextField }
