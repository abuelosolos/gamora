import * as React from "react"
import Link from "next/link"
import {
  CaretLeft,
  ChatCircle,
  DotsThreeVertical,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from "@/components/icons"
import { TopBar, TopBarButton } from "@/components/layout/top-bar"
import { Logo } from "@/components/shared/logo"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Chip, chipVariants } from "@/components/ui/chip"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Figma: Top Navbar (component set, six variants, 50px high). Each screen
 * picks its variant; the bar itself is the shared TopBar.
 *
 *   home      Logo                    | Search, Chat, Avatar
 *   activity  "Activity"              | Search, Chat, Avatar
 *   jobs      "Jobs"                  | Search, Filters
 *   profile   Back                    | Search, More
 *   post      Close                   | Drafts, Post
 *   settings  Back + "Edit profile"   | Save (greyed out while there is nothing to save: canSave=false)
 *   page      Back + title            | nothing (settings list, appearance, account)
 *
 * Search opens /search (people). Jobs search is a separate screen that is not
 * built, so its icon stays disabled, and chat goes to the Coming soon screen.
 * The bar hides while scrolling down (except post and settings). Pass a slot (`filters`, `more`) to
 * replace a disabled placeholder when its feature exists.
 */
export interface TopNavbarViewer {
  name: string
  username: string
  avatarUrl: string | null
}

export type TopNavbarProps = { className?: string } & (
  | { variant: "home"; viewer: TopNavbarViewer | null; below?: React.ReactNode }
  | { variant: "activity"; viewer: TopNavbarViewer | null }
  | { variant: "jobs"; filters?: React.ReactNode }
  | { variant: "profile"; backHref: string; more?: React.ReactNode }
  | { variant: "post"; closeHref: string; formId: string; submitting?: boolean; canPost?: boolean }
  | { variant: "settings"; backHref: string; formId: string; saving?: boolean; canSave?: boolean; title?: string }
  | { variant: "page"; backHref: string; title?: string }
)

function SearchButton() {
  return (
    <TopBarButton label="Search" asChild>
      <Link href="/search">
        <MagnifyingGlass aria-hidden="true" />
      </Link>
    </TopBarButton>
  )
}

/** Jobs has its own search screen in the design (job titles); until it is built the icon is inert. */
function JobsSearchButton() {
  return (
    <TopBarButton label="Search jobs, coming soon" disabled>
      <MagnifyingGlass aria-hidden="true" />
    </TopBarButton>
  )
}

function ChatButton() {
  return (
    <TopBarButton label="Messages, coming soon" asChild>
      <Link href="/unavailable/chat">
        <ChatCircle aria-hidden="true" />
      </Link>
    </TopBarButton>
  )
}

function ViewerAvatar({ viewer }: { viewer: TopNavbarViewer | null }) {
  if (!viewer) {
    return (
      // Fixed 96 x 44 px so the bar never shifts; accent outline keeps the text accent on any theme.
      <Button asChild size="xs" variant="outline-accent" className="h-11 w-24 px-0">
        <Link href="/sign-in?next=/feed">Sign in</Link>
      </Button>
    )
  }
  return (
    <Link
      href={`/u/${viewer.username}`}
      aria-label="Your profile"
      className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
    >
      <Avatar src={viewer.avatarUrl} name={viewer.name} size="sm" />
    </Link>
  )
}

function BackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <TopBarButton label={label} asChild>
      <Link href={href}>
        <CaretLeft aria-hidden="true" className="size-6" />
      </Link>
    </TopBarButton>
  )
}

function TopNavbar(props: TopNavbarProps) {
  const { className } = props

  switch (props.variant) {
    case "home":
      return (
        <TopBar
          className={className}
          below={props.below}
          bordered={props.below !== undefined}
          leading={<Logo title="Gamora" className="size-7.5" />}
          trailing={
            <>
              <SearchButton />
              <ChatButton />
              <ViewerAvatar viewer={props.viewer} />
            </>
          }
        />
      )

    case "activity":
      return (
        <TopBar
          className={className}
          title="Activity"
          trailing={
            <>
              <SearchButton />
              <ChatButton />
              <ViewerAvatar viewer={props.viewer} />
            </>
          }
        />
      )

    case "jobs":
      return (
        <TopBar
          className={className}
          title="Jobs"
          trailing={
            <>
              <JobsSearchButton />
              {props.filters ?? (
                <TopBarButton label="Filters, coming soon" disabled>
                  <SlidersHorizontal aria-hidden="true" />
                </TopBarButton>
              )}
            </>
          }
        />
      )

    case "profile":
      return (
        <TopBar
          className={className}
          leading={<BackButton href={props.backHref} />}
          trailing={
            <>
              <SearchButton />
              {props.more ?? (
                <TopBarButton label="More options, coming soon" disabled>
                  <DotsThreeVertical aria-hidden="true" />
                </TopBarButton>
              )}
            </>
          }
        />
      )

    case "post":
      return (
        <TopBar
          className={className}
          hideOnScroll={false}
          leading={
            <TopBarButton label="Close" asChild>
              <Link href={props.closeHref}>
                <X aria-hidden="true" className="size-6" />
              </Link>
            </TopBarButton>
          }
          trailing={
            <>
              <Chip disabled aria-label="Drafts, coming soon" className="border-transparent">
                Drafts
              </Chip>
              {/* Figma Pills: 28px accent pill, caption text; grey until there is something to post. */}
              <button
                type="submit"
                form={props.formId}
                disabled={props.submitting || props.canPost === false}
                className={chipVariants({ variant: "selected", className: "disabled:border-bgSurface disabled:bg-bgSurface" })}
              >
                Post
              </button>
            </>
          }
        />
      )

    // Settings list and its sub-screens (appearance, account): back + title, nothing to save.
    case "page":
      return (
        <TopBar
          className={className}
          leading={
            <>
              <BackButton href={props.backHref} />
              {props.title ? <h1 className="truncate text-body font-medium text-textPrimary">{props.title}</h1> : null}
            </>
          }
        />
      )

    case "settings":
      return (
        <TopBar
          className={className}
          hideOnScroll={false}
          leading={
            <>
              <BackButton href={props.backHref} />
              <h1 className="truncate text-body font-medium text-textPrimary">{props.title ?? "Edit profile"}</h1>
            </>
          }
          trailing={
            <Button
              type="submit"
              form={props.formId}
              variant="ghost"
              size="xs"
              loading={props.saving}
              disabled={props.canSave === false}
              className={props.canSave === false ? undefined : "text-textPrimary"}
            >
              Save
            </Button>
          }
        />
      )
  }
}

/** The bar while the viewer is loading: same height, logo already visible. */
function TopNavbarSkeleton({ className, below }: { className?: string; below?: React.ReactNode }) {
  return (
    <TopBar
      className={className}
      below={below}
      bordered={below !== undefined}
      leading={<Logo title="Gamora" className="size-7.5" />}
      trailing={<Skeleton className="size-7.5 rounded-full" />}
    />
  )
}

export { TopNavbar, TopNavbarSkeleton }
