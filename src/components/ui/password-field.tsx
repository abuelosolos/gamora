"use client"

import * as React from "react"
import { Eye, EyeSlash, Key } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { TextField, type TextFieldProps } from "@/components/ui/text-field"

/**
 * Figma: password input with a key icon and an eye toggle. The toggle is a real
 * button with aria-pressed and a label, 44px touch target.
 */
export type PasswordFieldProps = Omit<TextFieldProps, "type" | "leadingIcon" | "trailing">

function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      leadingIcon={<Key />}
      trailing={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="text-textSecondary [&_svg:not([class*='size-'])]:size-6"
        >
          {visible ? <EyeSlash /> : <Eye />}
        </Button>
      }
    />
  )
}

export { PasswordField }
