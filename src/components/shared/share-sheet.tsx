"use client"

import * as React from "react"
import {
  ChatCircle,
  DotsThree,
  EnvelopeSimple,
  FacebookLogo,
  Link,
  ShareNetwork,
  TelegramLogo,
  WhatsappLogo,
  XLogo,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/toast"
import { shareTargets, type ShareTarget } from "@/lib/share"

/**
 * The share popup, used for jobs, posts and profiles. A bottom sheet with the
 * platforms (WhatsApp, X, Facebook, Telegram, Email, Messages), Copy link and,
 * where the browser has it, More (the phone's own share list, which also has
 * apps with no share link, like Instagram). Platform links open the installed
 * app on a phone and the website otherwise. No close button: drag down or tap
 * outside.
 *
 * Wrap any trigger: <ShareSheet path="/post/1" title="…"><Button/></ShareSheet>,
 * or use ShareButton for the standard icon button.
 */
const ICONS: Record<ShareTarget["id"], React.ComponentType<React.ComponentProps<"svg">>> = {
  whatsapp: WhatsappLogo,
  x: XLogo,
  facebook: FacebookLogo,
  telegram: TelegramLogo,
  email: EnvelopeSimple,
  messages: ChatCircle,
}

const tile =
  "flex min-h-11 flex-col items-center gap-1 rounded-ui-md py-1 text-caption text-textSecondary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
const disc = "flex size-11 items-center justify-center rounded-full bg-bgSurface text-textSecondary [&_svg]:size-5"

export interface ShareSheetProps {
  /** Site path of the thing shared, e.g. "/post/<id>". The origin is added in the browser. */
  path: string
  /** Name of the thing, used as the title and in the message. */
  title: string
  /** Optional message to send with the link. */
  text?: string
  /** The element that opens the sheet (rendered through asChild). */
  children: React.ReactNode
}

function ShareSheet({ path, title, text, children }: ShareSheetProps) {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [canShare, setCanShare] = React.useState(false)

  function onOpenChange(next: boolean) {
    if (next) {
      setUrl(`${window.location.origin}${path}`)
      setCanShare(typeof navigator.share === "function")
    }
    setOpen(next)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast({ variant: "success", title: "Link copied" })
      setOpen(false)
    } catch {
      toast({ variant: "error", title: "Could not copy the link" })
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url })
      setOpen(false)
    } catch {
      // The reader closed the system list: nothing to do.
    }
  }

  const targets = url ? shareTargets({ url, title, text }) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="max-h-[90dvh]">
        <div className="flex flex-col gap-1 px-5 pt-2">
          <SheetTitle>Share</SheetTitle>
          <SheetDescription className="truncate">{title}</SheetDescription>
        </div>
        <ul className="grid grid-cols-4 gap-x-2 gap-y-4 overflow-y-auto px-5 pt-5 pb-4">
          {targets.map((target) => {
            const Icon = ICONS[target.id]
            const external = target.href.startsWith("http")
            return (
              <li key={target.id}>
                <a
                  href={target.href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className={tile}
                >
                  <span className={disc}>
                    <Icon aria-hidden="true" />
                  </span>
                  {target.label}
                </a>
              </li>
            )
          })}
          <li>
            <button type="button" onClick={() => void copyLink()} className={tile + " w-full"}>
              <span className={disc}>
                <Link aria-hidden="true" />
              </span>
              Copy link
            </button>
          </li>
          {canShare ? (
            <li>
              <button type="button" onClick={() => void nativeShare()} className={tile + " w-full"}>
                <span className={disc}>
                  <DotsThree aria-hidden="true" />
                </span>
                More
              </button>
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

/** The standard share icon button (Figma ShareNetwork). */
function ShareButton({
  path,
  title,
  text,
  className,
  size = "icon-sm",
}: Omit<ShareSheetProps, "children"> & { className?: string; size?: React.ComponentProps<typeof Button>["size"] }) {
  return (
    <ShareSheet path={path} title={title} text={text}>
      <Button variant="ghost" size={size} aria-label={`Share ${title}`} className={className}>
        <ShareNetwork aria-hidden="true" />
      </Button>
    </ShareSheet>
  )
}

export { ShareButton, ShareSheet }
