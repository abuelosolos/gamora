import { ShareButton } from "@/components/shared/share-sheet"

/** Figma: ShareNetwork on the Job Card. Opens the share popup for the job page. */
function JobShareButton({ jobId, title, className }: { jobId: string; title: string; className?: string }) {
  return <ShareButton path={`/jobs/${jobId}`} title={title} text={`Job on Gamora: ${title}`} className={className} />
}

export { JobShareButton }
