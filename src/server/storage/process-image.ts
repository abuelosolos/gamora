import "server-only"
import { randomUUID } from "node:crypto"
import { del, put } from "@vercel/blob"
import sharp from "sharp"
import { env } from "@/lib/env.server"
import {
  UPLOAD_MAX_INPUT_DIMENSION,
  UPLOAD_OUTPUT_MAX_DIMENSION,
} from "@/server/validators/upload"

export type ProcessError = "unsupported_type" | "too_large_dimensions" | "invalid_image"

export type ProcessResult =
  | { ok: true; data: Buffer; width: number; height: number }
  | { ok: false; error: ProcessError }

/** Real type from the first bytes. The file name and sent MIME type are ignored. */
function detectType(b: Buffer): "jpeg" | "png" | "webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg"
  if (
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png"
  }
  if (
    b.length >= 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp"
  }
  return null
}

/**
 * Validates and re-encodes one image: magic bytes, max 6000 px, EXIF
 * orientation applied, resized to 2000 px, re-encoded as WebP. Re-encoding
 * drops EXIF/GPS and most hidden payloads (sharp keeps no metadata by default).
 */
const LIMIT_INPUT_PIXELS = UPLOAD_MAX_INPUT_DIMENSION * UPLOAD_MAX_INPUT_DIMENSION

/**
 * The checks every upload goes through before it is decoded: real type from the
 * first bytes, then the pixel cap from the header. Shared by posts and avatars.
 */
async function checkInput(input: Buffer): Promise<ProcessError | null> {
  if (!detectType(input)) return "unsupported_type"
  const meta = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS }).metadata()
  if (
    !meta.width ||
    !meta.height ||
    meta.width > UPLOAD_MAX_INPUT_DIMENSION ||
    meta.height > UPLOAD_MAX_INPUT_DIMENSION
  ) {
    return meta.width && meta.height ? "too_large_dimensions" : "invalid_image"
  }
  return null
}

export async function processImage(input: Buffer): Promise<ProcessResult> {
  try {
    const rejected = await checkInput(input)
    if (rejected) return { ok: false, error: rejected }

    const limitInputPixels = LIMIT_INPUT_PIXELS
    const { data, info } = await sharp(input, { limitInputPixels })
      .rotate()
      .resize(UPLOAD_OUTPUT_MAX_DIMENSION, UPLOAD_OUTPUT_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })

    return { ok: true, data, width: info.width, height: info.height }
  } catch (error) {
    console.error("[process-image] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "invalid_image" }
  }
}

/** Avatars are stored as a square of this many pixels. */
const AVATAR_SIZE = 512

/**
 * Same pipeline as processImage (magic bytes, 6000 px cap, EXIF orientation
 * applied, metadata dropped, WebP), but cropped to a 512 px square.
 */
export async function processAvatar(
  input: Buffer
): Promise<{ ok: true; data: Buffer } | { ok: false; error: ProcessError }> {
  try {
    const rejected = await checkInput(input)
    if (rejected) return { ok: false, error: rejected }

    const data = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer()
    return { ok: true, data }
  } catch (error) {
    console.error("[process-avatar] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "invalid_image" }
  }
}

/** Stores a processed avatar under the user's folder with a random name. */
export async function storeAvatar(userId: string, data: Buffer): Promise<string> {
  const blob = await put(`avatars/${userId}/${randomUUID()}.webp`, data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    token: env.BLOB_READ_WRITE_TOKEN,
  })
  return blob.url
}

export interface StoredImage {
  url: string
  width: number
  height: number
}

/** Stores a processed image under a random name. The original name is never used. */
export async function storeImage(userId: string, image: { data: Buffer; width: number; height: number }): Promise<StoredImage> {
  const blob = await put(`posts/${userId}/${randomUUID()}.webp`, image.data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  })
  return { url: blob.url, width: image.width, height: image.height }
}

/** Best-effort cleanup, used when a request or the post that owns the files fails. */
export async function deleteImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  try {
    await del(urls)
  } catch (error) {
    console.error("[process-image] cleanup failed", error instanceof Error ? error.message : "unknown")
  }
}
