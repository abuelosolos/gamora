import { z } from "zod"

export const UPLOAD_MAX_FILES = 4
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024
/** Inputs larger than this on either side are rejected. */
export const UPLOAD_MAX_INPUT_DIMENSION = 6000
/** Stored images are scaled down to fit this on the long side. */
export const UPLOAD_OUTPUT_MAX_DIMENSION = 2000

export const uploadFilesSchema = z
  .array(
    z.instanceof(File).refine((f) => f.size > 0 && f.size <= UPLOAD_MAX_BYTES, "File must be 1 byte to 5 MB.")
  )
  .min(1, "Choose at least one image.")
  .max(UPLOAD_MAX_FILES, `Upload up to ${UPLOAD_MAX_FILES} images.`)
