"use client"

import { ShareNetwork } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

/** Figma: ShareNetwork on the Job Card. Copies the link to the job page. */
function JobShareButton({ jobId, title, className }: { jobId: string; title: string; className?: string }) {
  const { toast } = useToast()

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`)
      toast({ variant: "success", title: "Link copied" })
    } catch {
      toast({ variant: "error", title: "Could not copy the link" })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Copy link to ${title}`}
      className={className}
      onClick={() => void copyLink()}
    >
      <ShareNetwork aria-hidden="true" />
    </Button>
  )
}

export { JobShareButton }
