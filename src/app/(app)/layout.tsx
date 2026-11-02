import { Suspense } from "react"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PhoneFrame } from "@/components/layout/phone-frame"

/**
 * Shell for the whole app: phone frame and bottom nav. No session check here,
 * because this group contains pages anyone can read.
 *
 *   (browse)  feed, post, profiles. Public. Writes are checked in the actions.
 *   (private) everything else. The layout in that group is the real gate.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col">{children}</div>
      {/* usePathname inside the nav suspends on dynamic routes, so it needs a boundary. */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </PhoneFrame>
  )
}
