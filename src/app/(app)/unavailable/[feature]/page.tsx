import { Suspense } from "react"
import { notFound } from "next/navigation"
import { TopBar } from "@/components/layout/top-bar"
import { ComingSoon, ComingSoonBackButton } from "@/components/shared/coming-soon"
import { isUnavailableFeature, UNAVAILABLE_FEATURES } from "@/lib/unavailable-features"

// Public and static in content: Coming soon for hirer tools, shop, wallet, chat,
// subscriptions and the Phase 8 screens. Only slugs from UNAVAILABLE_FEATURES
// are answered. The param is read inside Suspense like the other dynamic pages.
export const metadata = { title: "Coming soon" }

export default function UnavailablePage({ params }: PageProps<"/unavailable/[feature]">) {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar hideOnScroll={false} leading={<ComingSoonBackButton />} />
      <div className="flex flex-1 flex-col justify-center">
        <Suspense fallback={null}>
          <UnavailableContent params={params} />
        </Suspense>
      </div>
    </main>
  )
}

async function UnavailableContent({ params }: { params: PageProps<"/unavailable/[feature]">["params"] }) {
  const { feature } = await params
  if (!isUnavailableFeature(feature)) notFound()
  const info: { name: string; description?: string } = UNAVAILABLE_FEATURES[feature]

  return <ComingSoon feature={info.name} description={info.description} />
}
