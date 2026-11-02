import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { CaretLeft } from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { getUser } from "@/server/auth/session"
import { getPostById } from "@/server/services/posts"
import { postIdSchema } from "@/server/validators/posts"

// Public: readable signed out. There is no post-detail frame in Figma, so this
// reuses the post card at full width (variant="detail").
export const metadata = { title: "Post" }

export default function PostPage({ params }: PageProps<"/post/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar
        title="Post"
        leading={
          <TopBarButton label="Back to feed" asChild>
            <Link href="/feed">
              <CaretLeft aria-hidden="true" />
            </Link>
          </TopBarButton>
        }
      />
      <Suspense
        fallback={
          <div role="status" aria-label="Loading post">
            <PostCardSkeleton />
          </div>
        }
      >
        <PostContent params={params} />
      </Suspense>
    </main>
  )
}

async function PostContent({ params }: { params: PageProps<"/post/[id]">["params"] }) {
  const { id } = await params
  const parsed = postIdSchema.safeParse(id)
  if (!parsed.success) notFound()

  const user = await getUser()
  const post = await getPostById(parsed.data, user?.id ?? null)
  if (!post) notFound()

  return <PostCard post={post} variant="detail" />
}
