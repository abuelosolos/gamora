"use client"

// TEMPORARY review page for the component library. Delete src/app/dev when approved.

import * as React from "react"
import {
  ImagesSquare,
  MagnifyingGlass,
  SealCheck,
} from "@/components/icons"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PostButton } from "@/components/layout/post-button"
import { TopNavbar } from "@/components/layout/top-navbar"
import { ComingSoon } from "@/components/shared/coming-soon"
import { EmptyState } from "@/components/shared/empty-state"
import { useTheme } from "@/components/shared/theme-provider"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ToastCard, useToast } from "@/components/ui/toast"
import { THEMES, type Theme } from "@/lib/theme"

const LONG_NAME = "Maximilian Alexandrovich Featherstonehaugh-Wolfeschlegelstein"
const LONG_TEXT =
  "A very long line of user written text that keeps going and going to check that wrapping works without breaking the layout of the component"

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-title-s font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

/** Every component, rendered inside a [data-theme] scope so all five show at once. */
function ThemeSample({ theme }: { theme: Theme }) {
  const [selected, setSelected] = React.useState<string>("Posts")
  const id = React.useId()

  return (
    <section
      data-theme={theme}
      aria-label={`${theme} theme`}
      className="flex flex-col gap-8 rounded-ui-lg border border-borderDefault bg-bgDefault p-5 text-textPrimary"
    >
      <h2 className="font-display text-title-l font-semibold capitalize">{theme}</h2>

      <Group title="Button">
        <Row>
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="outline-accent">Outline accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled outline
          </Button>
          <Button loading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Search">
            <MagnifyingGlass aria-hidden="true" />
          </Button>
        </Row>
        <Button fullWidth>Full width: {LONG_TEXT}</Button>
      </Group>

      <Group title="Input and textarea">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="text-body-sm font-medium">
            Display name
          </label>
          <Input id={`${id}-name`} placeholder="Your name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-invalid`} className="text-body-sm font-medium">
            Username (error)
          </label>
          <Input id={`${id}-invalid`} defaultValue="not valid!" aria-invalid="true" aria-describedby={`${id}-err`} />
          <p id={`${id}-err`} className="text-caption text-statusError">
            Use letters, numbers and underscores only.
          </p>
        </div>
        <Input aria-label="Disabled input" placeholder="Disabled" disabled />
        <Input aria-label="Long value" defaultValue={LONG_TEXT} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-bio`} className="text-body-sm font-medium">
            Bio
          </label>
          <Textarea id={`${id}-bio`} placeholder="Tell people about your art" />
        </div>
        <Textarea aria-label="Disabled textarea" placeholder="Disabled" disabled />
      </Group>

      <Group title="Chip">
        <Row>
          <Chip variant="fill">NFT art</Chip>
          <Chip variant="outline">Pfp art</Chip>
          {["Drafts", "Posts"].map((label) => (
            <Chip key={label} selected={selected === label} onClick={() => setSelected(label)}>
              {label}
            </Chip>
          ))}
          <Chip disabled>Disabled</Chip>
          <Chip variant="fill">{LONG_NAME}</Chip>
        </Row>
      </Group>

      <Group title="Avatar">
        <Row>
          <Avatar name="Ada Lovelace" size="xs" />
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Ada Lovelace" size="md" />
          <Avatar name="Ada Lovelace" size="lg" />
          <Avatar name="Ada Lovelace" size="xl" />
          <Avatar name={LONG_NAME} size="md" />
          <Avatar name="Broken image" src="/does-not-exist.png" size="md" />
          <Avatar name="" size="md" />
        </Row>
      </Group>

      <Group title="Badge">
        <Row>
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="premium">Premium</Badge>
        </Row>
      </Group>

      <Group title="Skeleton">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-ui-md" />
      </Group>

      <Group title="Toast">
        <ToastCard title="Your post is being uploaded" progress={35} />
        <ToastCard variant="success" title="Your post was successfully uploaded" progress={100} />
        <ToastCard variant="success" title="Saved" description="Your profile changes are live." onDismiss={() => {}} />
        <ToastCard variant="error" title="Could not upload" description="Check your connection and try again." onDismiss={() => {}} />
        <ToastCard variant="info" title="New version available" />
        <ToastCard title={LONG_TEXT} description={LONG_TEXT} onDismiss={() => {}} />
      </Group>

      <Group title="Empty state">
        <div className="rounded-ui-md border border-borderDefault">
          <EmptyState
            icon={<ImagesSquare />}
            title="No posts yet"
            description="When you post your art it will show up here."
            action={<Button variant="outline-accent">Create a post</Button>}
          />
        </div>
      </Group>

      <Group title="Coming soon">
        <div className="rounded-ui-md border border-borderDefault">
          <ComingSoon feature="Shop" />
        </div>
      </Group>

      <Group title="Top Navbar (Home, Activity, Profile, Post, Jobs, Settings)">
        <div className="flex flex-col gap-2 overflow-hidden rounded-ui-md border border-borderDefault">
          <TopNavbar className="static" variant="home" viewer={{ name: "Ada Lovelace", username: "ada", avatarUrl: null }} />
          <TopNavbar className="static" variant="activity" viewer={{ name: "Ada Lovelace", username: "ada", avatarUrl: null }} />
          <TopNavbar className="static" variant="home" viewer={null} />
          <TopNavbar className="static" variant="profile" backHref="/feed" />
          <TopNavbar className="static" variant="post" closeHref="/feed" formId="demo" />
          <TopNavbar className="static" variant="jobs" />
          <TopNavbar className="static" variant="settings" backHref="/feed" formId="demo" />
          <TopNavbar className="static" variant="settings" backHref="/feed" formId="demo" title={LONG_NAME} />
        </div>
      </Group>

      <Group title="Bottom nav (icons only: Home, Jobs, Activity, Profile active; labels variant)">
        <div className="flex flex-col gap-6 rounded-ui-md border border-borderDefault bg-bgDefault px-1 py-6">
          <BottomNav activeHref="/feed" />
          <BottomNav activeHref="/jobs" />
          <BottomNav activeHref="/activity" />
          <BottomNav activeHref="/u/ada" />
          <BottomNav activeHref="/feed" showLabels />
        </div>
      </Group>

      <Group title="Post button (outside the nav, above it on Home)">
        <div className="flex flex-col items-end gap-3.75 rounded-ui-md border border-borderDefault bg-bgDefault px-1 py-6">
          <PostButton className="mr-5.5" />
          <BottomNav className="w-full" activeHref="/feed" />
        </div>
      </Group>
    </section>
  )
}

/** Dialog and sheet render in a portal at the page root, so they use the page theme (switch it above). */
function OverlayDemos() {
  const { toast, update } = useToast()

  function uploadDemo() {
    const id = toast({ title: "Your post is being uploaded", progress: 10 })
    let value = 10
    const timer = setInterval(() => {
      value += 30
      if (value >= 100) {
        clearInterval(timer)
        update(id, { title: "Your post was successfully uploaded", variant: "success", progress: 100 })
      } else {
        update(id, { progress: value })
      }
    }, 600)
  }

  return (
    <Row>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader className="items-center text-center">
            <SealCheck aria-hidden="true" className="size-18 text-statusSuccess" />
            <DialogTitle>Application Sent!</DialogTitle>
            <DialogDescription>You&rsquo;ll be notified when the hirer makes a decision</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col">
            <DialogClose asChild>
              <Button fullWidth>Continue Applying</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="outline-accent" fullWidth>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Report this post</SheetTitle>
            <SheetDescription>Tell us what is wrong. Your report is private.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-5">
            <label htmlFor="sheet-reason" className="text-body-sm font-medium">
              Reason
            </label>
            <Textarea id="sheet-reason" placeholder="Add details" />
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button fullWidth>Send report</Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" fullWidth>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Button variant="outline" onClick={uploadDemo}>
        Upload toast
      </Button>
      <Button variant="outline" onClick={() => toast({ variant: "error", title: "Could not save", description: "Try again." })}>
        Error toast
      </Button>
    </Row>
  )
}

export function ComponentsDemo() {
  const { theme, setTheme } = useTheme()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-bgDefault p-4 text-textPrimary">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-display font-semibold">Components (temporary)</h1>
        <p className="text-body-sm text-textSecondary">
          Each section below is one theme. Dialog, sheet and toasts open at the page root, so they follow the page
          theme: switch it here.
        </p>
        <Row>
          {THEMES.map((t) => (
            <Chip key={t} selected={theme === t} onClick={() => setTheme(t)} className="capitalize">
              {t}
            </Chip>
          ))}
        </Row>
        <OverlayDemos />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {THEMES.map((t) => (
          <ThemeSample key={t} theme={t} />
        ))}
      </div>
    </main>
  )
}
