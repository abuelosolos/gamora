import { Badge } from "@/components/ui/badge"
import { EmptyState, type EmptyStateProps } from "@/components/shared/empty-state"

export interface ComingSoonProps extends Omit<EmptyStateProps, "title" | "description"> {
  /** Name of the unavailable feature, e.g. "Shop" or "Wallet". */
  feature: string
  description?: string
}

/** Small "Coming soon" label for nav items and list rows. */
function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <Badge variant="neutral" className={className}>
      Coming soon
    </Badge>
  )
}

/**
 * Shown for features that are not available yet (hirer tools, shop, wallet,
 * chat, subscriptions). Built on EmptyState.
 */
function ComingSoon({ feature, description, icon, action, ...props }: ComingSoonProps) {
  return (
    <div data-slot="coming-soon" className="flex flex-col items-center pt-8">
      <ComingSoonBadge />
      <EmptyState
        icon={icon}
        title={`${feature} is coming soon`}
        description={description ?? "We are still building this. Check back in a little while."}
        action={action}
        {...props}
      />
    </div>
  )
}

export { ComingSoon, ComingSoonBadge }
