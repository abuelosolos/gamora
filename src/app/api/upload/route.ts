import { connection } from "next/server"
import { env } from "@/lib/env.server"
import { getSession } from "@/server/auth/session"
import { clientIp, withinRateLimits } from "@/server/security/rate-limit"
import {
  deleteImages,
  processImage,
  storeImage,
  type StoredImage,
} from "@/server/storage/process-image"
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_FILES,
  uploadFilesSchema,
} from "@/server/validators/upload"

const ERRORS = {
  forbidden: "Request not allowed.",
  unauthorized: "Sign in to upload images.",
  rate_limited: "You are uploading a lot. Please try again in a little while.",
  invalid: "Choose 1 to 4 images, each up to 5 MB.",
  unsupported_type: "Only JPEG, PNG and WebP images are allowed.",
  too_large_dimensions: "Images can be at most 6000 px on each side.",
  invalid_image: "We could not read one of the images.",
  server: "Something went wrong. Please try again.",
} as const

function fail(error: keyof typeof ERRORS, status: number) {
  return Response.json({ error, message: ERRORS[error] }, { status })
}

export async function POST(request: Request) {
  await connection()

  // CSRF: this route changes data, so the Origin must be our own app.
  const origin = request.headers.get("origin")
  if (!origin || origin !== new URL(env.BETTER_AUTH_URL).origin) return fail("forbidden", 403)

  const session = await getSession()
  if (!session) return fail("unauthorized", 401)
  const userId = session.user.id

  const ip = await clientIp()
  const allowed = await withinRateLimits([
    { name: "upload:user", key: userId, limit: 20, windowSeconds: 3600 },
    { name: "upload:ip", key: ip, limit: 40, windowSeconds: 3600 },
  ])
  if (!allowed) {
    console.warn(`[upload] rate limited user=${userId}`)
    return fail("rate_limited", 429)
  }

  // Cheap size check before the body is buffered (headers can lie, sizes are re-checked below).
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (declared > UPLOAD_MAX_BYTES * UPLOAD_MAX_FILES + 1024 * 1024) return fail("invalid", 413)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail("invalid", 400)
  }

  const parsed = uploadFilesSchema.safeParse(form.getAll("files"))
  if (!parsed.success) return fail("invalid", 400)

  const stored: StoredImage[] = []
  try {
    for (const file of parsed.data) {
      const result = await processImage(Buffer.from(await file.arrayBuffer()))
      if (!result.ok) {
        await deleteImages(stored.map((s) => s.url))
        return fail(result.error, 400)
      }
      stored.push(await storeImage(userId, result))
    }
  } catch (error) {
    console.error("[upload] failed", error instanceof Error ? error.message : "unknown")
    await deleteImages(stored.map((s) => s.url))
    return fail("server", 500)
  }

  return Response.json({ files: stored })
}
