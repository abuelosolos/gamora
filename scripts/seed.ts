/**
 * Demo data: a few INVENTED artists and posts so the feed is never empty.
 *
 *   npm run db:seed
 *
 * Every demo profile has a bio that starts with "DEMO ACCOUNT" and a username
 * ending in "_demo", every demo post starts with "Sample post.", and every job
 * is flagged is_sample (shown with a Sample badge). The names are made up and do not refer to real people.
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
import { jobs, postImages, posts, profile, user } from "@/server/db/schema"

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

interface DemoJob {
  title: string
  summary: string
  description: string
  posterName: string
  jobType: "full_time" | "part_time" | "contract" | "freelance"
  payAmount: number
  payUnit: string
}

// SAMPLE jobs. Poster names are invented; every row is flagged is_sample.
// The first three are the ones in the Figma Jobs screen.
const JOBS: DemoJob[] = [
  {
    title: "Fantasy Novel Cover Art",
    summary: "Pixel artist needed for a minecraft fantasy novel series cover",
    description:
      "We are a small indie press looking for a pixel artist to paint covers for a three-book fantasy series set in a blocky, Minecraft-inspired world.\n\nYou would deliver one cover per book, plus a wide banner crop for each. Send us works that show your pixel and fantasy scenes.",
    posterName: "Anna Stacy Huh",
    jobType: "full_time",
    payAmount: 200,
    payUnit: "Cover",
  },
  {
    title: "Mystery Thriller Book Cover Design",
    summary: "Graphic designer sought for a gripping mystery thriller series cover",
    description:
      "A thriller series needs a consistent look: dark palettes, bold type and one striking central image per cover.\n\nPart time, spread over a few weeks. Show us covers or posters that carry a mood.",
    posterName: "Liam Rodriguez",
    jobType: "part_time",
    payAmount: 150,
    payUnit: "Cover",
  },
  {
    title: "Sci-Fi Graphic Novel Illustrations",
    summary: "Illustrator needed for a futuristic sci-fi graphic novel",
    description:
      "Full-page and spot illustrations for a futuristic graphic novel. You will work from a script and character sheets, and we review sketches before final art.\n\nContract work, paid per finished illustration.",
    posterName: "Sophie Chen",
    jobType: "contract",
    payAmount: 250,
    payUnit: "Illustration",
  },
  {
    title: "Romantic Comedy E-Book Cover",
    summary: "Designer required for a lighthearted romantic comedy e-book cover",
    description:
      "One bright, playful cover for a romantic comedy e-book, in a flat illustrated style. Two rounds of changes are included.",
    posterName: "James Patel",
    jobType: "freelance",
    payAmount: 100,
    payUnit: "Cover",
  },
  {
    title: "Character Designs for a Card Game",
    summary: "Cartoon artist wanted for twelve original card game characters",
    description:
      "A tabletop card game needs twelve original characters with clear silhouettes and strong colour. We supply short descriptions; you supply the look.",
    posterName: "Maya Okafor",
    jobType: "freelance",
    payAmount: 80,
    payUnit: "Character",
  },
  {
    title: "Animated Logo Loop",
    summary: "Animator needed for a short looping logo for a podcast",
    description:
      "A three-second looping animation of an existing logo, delivered as a video and a GIF. Simple motion, polished timing.",
    posterName: "Daniel Reyes",
    jobType: "contract",
    payAmount: 300,
    payUnit: "Loop",
  },
  {
    title: "Weekly Webcomic Panels",
    summary: "Comic artist for a weekly four-panel webcomic",
    description:
      "A weekly four-panel comic with a steady cast. Scripts arrive on Mondays and finished panels are due by Friday.",
    posterName: "Ines Moreau",
    jobType: "part_time",
    payAmount: 120,
    payUnit: "Strip",
  },
  {
    title: "Profile Pictures for a Community",
    summary: "Pfp artist needed for a set of twenty community avatars",
    description:
      "Twenty matching profile pictures for an online art community, all on the same grid and palette so they look like a set.",
    posterName: "Tunde Bello",
    jobType: "full_time",
    payAmount: 60,
    payUnit: "Avatar",
  },
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
      // Every demo post says so in its text, so it is never mistaken for real work.
      body: `Sample post. ${post.body}`,
      createdAt: new Date(now - index * 3 * HOUR - 5 * 60 * 1000),
    })
    if (images.length > 0) {
      await db.insert(postImages).values(
        images.map((image, position) => ({ ...image, postId: id, position, altText: "" }))
      )
    }
    console.log(`  + @${post.author}: ${images.length} image(s)`)
  }

  // 4. Sample jobs. They have no owner, so the user delete above does not remove them: clear and recreate.
  console.log(`Creating ${JOBS.length} sample jobs`)
  await db.delete(jobs).where(eq(jobs.isSample, true))
  await db.insert(jobs).values(
    JOBS.map((job, index) => ({ ...job, isSample: true, createdAt: new Date(now - index * 6 * HOUR) }))
  )

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
