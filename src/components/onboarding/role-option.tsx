import * as React from "react"
import { RadioButton, RadioButtonFilled } from "@/components/icons"
import { ComingSoonBadge } from "@/components/shared/coming-soon"
import { cn } from "@/lib/utils"

/**
 * Figma: role row on "What are you doing on Gamora?". Leading icon, label and a
 * radio on the right. Unavailable roles are dimmed, not selectable, and carry
 * a Coming soon badge. Use inside a container with role="radiogroup".
 */
export interface RoleOptionProps {
  label: string
  icon: React.ReactNode
  selected?: boolean
  /** Not available yet: shows the Coming soon badge and cannot be chosen. */
  comingSoon?: boolean
  onSelect?: () => void
}

function RoleOption({ label, icon, selected = false, comingSoon = false, onSelect }: RoleOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={comingSoon || undefined}
      onClick={comingSoon ? undefined : onSelect}
      data-slot="role-option"
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-ui-md px-2 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accentDefault",
        comingSoon ? "cursor-not-allowed text-textSecondary" : "text-textPrimary hover:bg-bgSurface"
      )}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center [&_svg]:size-6">
        {icon}
      </span>
      <span className="flex-1 text-body-sm">{label}</span>
      {comingSoon ? <ComingSoonBadge /> : null}
      <span aria-hidden="true" className={cn("flex shrink-0 items-center [&_svg]:size-6", selected && "text-accentDefault")}>
        {selected ? <RadioButtonFilled /> : <RadioButton />}
      </span>
    </button>
  )
}

export { RoleOption }
