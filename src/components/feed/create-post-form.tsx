"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Camera, ImagesSquare, LinkSimple, Video, X } from "@/components/icons"
import { usePostUpload } from "@/components/feed/post-upload"
import { TopNavbar } from "@/components/layout/top-navbar"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Textarea } from "@/components/ui/textarea"
import { POST_BODY_MAX, POST_MAX_IMAGES } from "@/server/validators/posts"
import { UPLOAD_MAX_BYTES } from "@/server/validators/upload"

/**
 * Figma: Post, Post (Multi Images), Post (Uploading), Post (Uploaded).
 *
 * Flow: pick images (kept in the browser), press Post; the composer closes and
 * the feed shows the upload bar (see post-upload.tsx), which uploads them to
 * /api/upload and then creates the post with the returned URLs. The bar shows
 * "Your post is being uploaded" with a progress bar (the Figma popup) and turns
 * green when done. If it fails, the server deletes any uploaded files and the
 * bar offers Try again (the provider keeps the text and files until then).
 *
 * Deviations: "Subscribers" and Drafts, video and link are disabled (Coming
 * soon), so "Everyone" is the only audience. Alt text has no field in the
 * design, so images are saved with empty alt text for now.
 */
const ACCEPT = "image/jpeg,image/png,image/webp"
const TYPES = ACCEPT.split(",")
const SHOW_COUNTER_FROM = Math.floor(POST_BODY_MAX * 0.9)

interface Picked {
  id: string
  file: File
  previewUrl: string
}

export interface CreatePostFormProps {
  name: string
  avatarUrl: string | null
}

function CreatePostForm({ name, avatarUrl }: CreatePostFormProps) {
  const router = useRouter()
  const { start: startUpload } = usePostUpload()
  const [body, setBody] = React.useState("")
  const [picked, setPicked] = React.useState<Picked[]>([])
  const [error, setError] = React.useState("")
  const libraryInput = React.useRef<HTMLInputElement>(null)
  const cameraInput = React.useRef<HTMLInputElement>(null)
  const pickedRef = React.useRef<Picked[]>([])

  React.useEffect(() => {
    pickedRef.current = picked
  }, [picked])
  // Free the preview object URLs when the screen closes.
  React.useEffect(() => () => pickedRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), [])

  function addFiles(list: FileList | null) {
    if (!list) return
    setError("")
    const accepted: Picked[] = []
    let message = ""
    for (const file of Array.from(list)) {
      if (picked.length + accepted.length >= POST_MAX_IMAGES) {
        message = `You can add up to ${POST_MAX_IMAGES} images.`
        break
      }
      if (!TYPES.includes(file.type)) {
        message = "Only JPEG, PNG and WebP images are allowed."
        continue
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        message = "Each image must be 5 MB or smaller."
        continue
      }
      accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) })
    }
    if (accepted.length > 0) setPicked((current) => [...current, ...accepted])
    if (message) setError(message)
  }

  function removeImage(id: string) {
    setPicked((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = body.trim()
    if (text.length === 0 && picked.length === 0) {
      setError("Write something or add an image.")
      return
    }
    setError("")
    // The upload continues on the feed (see PostUploadBanner), so close the composer now.
    startUpload({ body: text, files: picked.map((item) => item.file) })
    router.push("/feed")
  }

  const tool = "text-textSecondary [&_svg:not([class*='size-'])]:size-5"
  const remaining = POST_BODY_MAX - body.length

  return (
    <form id="create-post" onSubmit={onSubmit} className="flex flex-1 flex-col" noValidate>
      <TopNavbar variant="post" closeHref="/feed" formId="create-post" canPost={body.trim().length > 0 || picked.length > 0}
      />

      <fieldset className="flex flex-col gap-2.5 px-5 py-2.5">
        <legend className="mb-2.5 text-caption text-textPrimary">Who can see this?</legend>
        <div className="flex items-center gap-4">
          <Chip variant="fill" disabled aria-label="Subscribers, coming soon">
            Subscribers
          </Chip>
          <Chip selected>Everyone</Chip>
        </div>
      </fieldset>

      <div className="flex items-start gap-3 px-5 py-2.5">
        <Avatar src={avatarUrl} name={name} className="mt-1 size-9.5" />
        <div className="min-w-0 flex-1">
          <label htmlFor="post-body" className="sr-only">
            Post text
          </label>
          <Textarea
            id="post-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={POST_BODY_MAX}
            placeholder="What have you been working on?"
            className="min-h-11 resize-none border-transparent px-2 py-2 text-caption [field-sizing:content] focus-visible:border-transparent focus-visible:ring-0"
            rows={2}
            aria-describedby="post-hint"
          />
          <p
            id="post-hint"
            className={remaining <= POST_BODY_MAX - SHOW_COUNTER_FROM ? "px-2 text-caption text-textSecondary" : "sr-only"}
          >
            {remaining} characters left
          </p>
        </div>
      </div>

      {picked.length > 0 ? (
        <ul aria-label="Selected images" className="flex snap-x gap-2.5 overflow-x-auto px-5 py-2.5">
          {picked.map((item, index) => (
            <li
              key={item.id}
              className="relative h-37 w-37.5 shrink-0 snap-start overflow-hidden rounded-ui-md border border-borderStrong bg-bgSurface"
            >
              <Image
                src={item.previewUrl}
                alt={`Selected image ${index + 1}`}
                fill
                unoptimized
                sizes="150px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(item.id)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-bgDefault/90">
                  <X aria-hidden="true" className="size-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="px-5 py-2.5 text-body-sm text-statusError">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-1 px-4 py-1">
        <input
          ref={cameraInput}
          type="file"
          accept={ACCEPT}
          capture="environment"
          hidden
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <input
          ref={libraryInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Take a photo"
          className={tool}
          disabled={picked.length >= POST_MAX_IMAGES}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Add images"
          className={tool}
          disabled={picked.length >= POST_MAX_IMAGES}
          onClick={() => libraryInput.current?.click()}
        >
          <ImagesSquare aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Add video, coming soon" className={tool} disabled>
          <Video aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Add link, coming soon" className={tool} disabled>
          <LinkSimple aria-hidden="true" />
        </Button>
      </div>
    </form>
  )
}

export { CreatePostForm }
