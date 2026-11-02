import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ReplySection, ReplySectionSkeleton } from "@/components/replies/reply-section"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { CaretLeft } from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { getUser } from "@/server/auth/session"
import { listReplies } from "@/server/services/interactions"
import { getPostById } from "@/server/services/posts"
import { getProfileByUserId } from "@/server/services/profile"
import { postIdSchema } from "@/server/validators/posts"

// Public: readable signed out. There is no post-detail frame in Figma, so this
// reuses the post card at full width (variant="detail") with the replies below.
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
            <ReplySectionSkeleton />
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
  const [post, replies, profile] = await Promise.all([
    getPostById(parsed.data, user?.id ?? null),
    listReplies({ postId: parsed.data, cursor: null, viewerId: user?.id ?? null }),
    user ? getProfileByUserId(user.id) : null,
  ])
  if (!post) notFound()

  return (
    <>
      <PostCard post={post} variant="detail" />
      <ReplySection
        postId={post.id}
        initial={replies}
        initialCount={post.replyCount}
        viewer={user && profile ? { name: user.name, username: profile.username, avatarUrl: profile.avatarUrl } : null}
      />
    </>
  )
}
