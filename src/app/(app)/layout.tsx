import { Suspense } from "react"
import { PostUploadProvider } from "@/components/feed/post-upload"
import { AppChrome } from "@/components/layout/app-chrome"
import { PhoneFrame } from "@/components/layout/phone-frame"

/**
 * Shell for the whole app: phone frame, bottom nav and post button. No session
 * check here, because this group contains pages anyone can read.
 *
 *   (browse)  feed, post, profiles. Public. Writes are checked in the actions.
 *   (private) everything else. The layout in that group is the real gate.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame>
      {/* Keeps a post upload running while the page changes from the composer to the feed. */}
      <PostUploadProvider>
        <div className="flex flex-1 flex-col">{children}</div>
      </PostUploadProvider>
      {/* usePathname inside the chrome suspends on dynamic routes, so it needs a boundary. */}
      <Suspense fallback={null}>
        <AppChrome />
      </Suspense>
    </PhoneFrame>
  )
}
