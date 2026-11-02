/**
 * Demo data: a few INVENTED artists and posts so the feed is never empty.
 *
 *   npm run db:seed
 *
 * Every demo profile has a bio that starts with "DEMO ACCOUNT" and a username
 * ending in "_demo". The names are made up and do not refer to real people.
 * The demo users have no password and no account row, so nobody can sign in as
 * them.
 *
 * Images: drop your placeholder files into src/server/db/seed-data (see the
 * README there). A missing image is skipped with a warning, so the script also
 * runs with no images at all.
 *
 * Safe to run again: it first removes the demo users it created before (their
 * profiles, posts and images go with them, and their files are deleted from
 * Blob), then creates them fresh.
 *
 * Environment: the values come from the process (`npm run db:seed` loads
 * .env.local through tsx). This file never reads an env file itself.
 *
 * Not importing @/server/db or @/lib/env.server on purpose: both are
 * "server-only" and refuse to load outside Next.js. The database connection and
 * image processing are small and repeated here.
 */
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { neon } from "@neondatabase/serverless"
import { del, put } from "@vercel/blob"
import { eq, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import sharp from "sharp"
import type { Interest } from "@/lib/interests"
import { postImages, posts, profile, user } from "@/server/db/schema"

const SEED_DIR = path.join(process.cwd(), "src/server/db/seed-data")
const EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"]
const HOUR = 60 * 60 * 1000

interface DemoArtist {
  username: string
  name: string
  bio: string
  interests: Interest[]
}

interface DemoPost {
  author: string
  body: string
  /** File names without extension, looked up in seed-data. */
  images: string[]
}

// All names are invented. Bios are at most 160 characters (database check).
const ARTISTS: DemoArtist[] = [
  {
    username: "mira_demo",
    name: "Mira Vale",
    bio: "DEMO ACCOUNT. Invented artist. Digital portraits and character studies.",
    interests: ["Digital painting", "Character design"],
  },
  {
    username: "tobi_demo",
    name: "Tobi Lindqvist",
    bio: "DEMO ACCOUNT. Invented artist. Cartoon redesigns, fire and fantasy.",
    interests: ["Cartoon art", "Character design"],
  },
  {
    username: "sana_demo",
    name: "Sana Ferreira",
    bio: "DEMO ACCOUNT. Invented artist. Illustration with bold flat color.",
    interests: ["Illustration", "Cartoon art"],
  },
  {
    // No avatar file on purpose: shows the initials fallback.
    username: "juno_demo",
    name: "Juno Castellan",
    bio: "DEMO ACCOUNT. Invented artist. Glow effects and lighting tests.",
    interests: ["Animations", "Cartoon art"],
  },
  {
    username: "kai_demo",
    name: "Kai Brennan",
    bio: "DEMO ACCOUNT. Invented artist. Comics, sketchbook pages and stray ideas.",
    interests: ["Cartoon art", "Indie art"],
  },
]

// art-01..art-04 are the four art images in seed-data.
const POSTS: DemoPost[] = [
  { author: "mira_demo", body: "Pose study. Flat colors, no lineart.", images: ["art-01"] },
  { author: "mira_demo", body: "Slow week. Sketching in the margins and thinking about the next piece.", images: [] },
  { author: "tobi_demo", body: "Fire redesign, finished.", images: ["art-03"] },
  { author: "tobi_demo", body: "The pose study next to the redesign.", images: ["art-01", "art-03"] },
  { author: "sana_demo", body: "Two characters, one red background.", images: ["art-04"] },
  { author: "sana_demo", body: "Which color palette would you use for a night scene?", images: [] },
  { author: "juno_demo", body: "Glow effect test: pink against cyan.", images: ["art-02"] },
  { author: "kai_demo", body: "What should the next comic be about? Open to ideas.", images: [] },
]

const demoId = (username: string) => `demo-${username}`

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Run this with: npm run db:seed (it loads .env.local).`)
    process.exit(1)
  }
  return value
}

async function findImage(name: string): Promise<Buffer | null> {
  for (const extension of EXTENSIONS) {
    try {
      return await readFile(path.join(SEED_DIR, `${name}${extension}`))
    } catch {
      // try the next extension
    }
  }
  console.warn(`  ! no image found for "${name}" in src/server/db/seed-data, skipping it`)
  return null
}

async function upload(folder: string, userId: string, data: Buffer) {
  const blob = await put(`${folder}/${userId}/${randomUUID()}.webp`, data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  })
  return blob.url
}

async function main() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    console.error("Refusing to seed demo data in production.")
    process.exit(1)
  }

  const db = drizzle(neon(requireEnv("DATABASE_URL")))
  requireEnv("BLOB_READ_WRITE_TOKEN") // read by @vercel/blob from the environment

  const ids = ARTISTS.map((artist) => demoId(artist.username))

  // 1. Remove what an earlier run created: Blob files first (URLs are needed), then the users.
  const oldImages = await db
    .select({ url: postImages.url })
    .from(postImages)
    .innerJoin(posts, eq(posts.id, postImages.postId))
    .where(inArray(posts.authorId, ids))
  const oldAvatars = await db
    .select({ url: profile.avatarUrl })
    .from(profile)
    .where(inArray(profile.userId, ids))
  const oldUrls = [...oldImages.map((r) => r.url), ...oldAvatars.map((r) => r.url)].filter(
    (url): url is string => Boolean(url)
  )
  await db.delete(user).where(inArray(user.id, ids)) // cascades to profile, posts, post_images
  if (oldUrls.length > 0) await del(oldUrls).catch(() => console.warn("  ! could not delete some old files"))

  // 2. Artists.
  console.log(`Creating ${ARTISTS.length} demo artists`)
  for (const artist of ARTISTS) {
    const id = demoId(artist.username)
    const raw = await findImage(`avatar-${artist.username}`)
    const avatarUrl = raw
      ? await upload(
          "avatars",
          id,
          await sharp(raw, { limitInputPixels: 6000 * 6000 })
            .rotate()
            .resize(512, 512, { fit: "cover" })
            .webp({ quality: 85 })
            .toBuffer()
        )
      : null

    await db.insert(user).values({
      id,
      name: artist.name,
      // .invalid is a reserved top-level domain: this address can never receive mail.
      email: `${id}@gamora.invalid`,
      emailVerified: false,
      image: avatarUrl,
    })
    await db.insert(profile).values({
      userId: id,
      username: artist.username,
      bio: artist.bio,
      role: "artist",
      avatarUrl,
      interests: artist.interests,
      isAdmin: false,
    })
    console.log(`  + @${artist.username}${avatarUrl ? "" : " (no avatar)"}`)
  }

  // 3. Posts, newest first in the list; spread over the last day so the feed order is stable.
  console.log(`Creating ${POSTS.length} demo posts`)
  const now = Date.now()
  for (const [index, post] of POSTS.entries()) {
    const authorId = demoId(post.author)
    const images: { url: string; width: number; height: number }[] = []

    for (const name of post.images) {
      const raw = await findImage(name)
      if (!raw) continue
      const meta = await sharp(raw, { limitInputPixels: 6000 * 6000 }).metadata()
      if (!meta.width || !meta.height || meta.width > 6000 || meta.height > 6000) {
        console.warn(`  ! "${name}" is larger than 6000 px, skipping it`)
        continue
      }
      const { data, info } = await sharp(raw, { limitInputPixels: 6000 * 6000 })
        .rotate()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      images.push({ url: await upload("posts", authorId, data), width: info.width, height: info.height })
    }

    // A post that was meant to have images but got none still has its text.
    const id = randomUUID()
    await db.insert(posts).values({
      id,
      authorId,
      body: post.body,
      createdAt: new Date(now - index * 3 * HOUR - 5 * 60 * 1000),
    })
    if (images.length > 0) {
      await db.insert(postImages).values(
        images.map((image, position) => ({ ...image, postId: id, position, altText: "" }))
      )
    }
    console.log(`  + @${post.author}: ${images.length} image(s)`)
  }

  console.log("Done.")
}

main().catch((error) => {
  // Print the message only. Connection strings and tokens are never logged.
  console.error("Seed failed:", error instanceof Error ? error.message.split("\nparams:")[0] : "unknown error")
  // Drizzle wraps the database error; the real reason (e.g. 'relation "posts" does not exist') is in `cause`.
  const cause = error instanceof Error ? error.cause : undefined
  if (cause instanceof Error) console.error("Reason:", cause.message)
  process.exit(1)
})
