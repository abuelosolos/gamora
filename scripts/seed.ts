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
  category: string
  medium: "digital" | "traditional" | "sculpture" | "paper" | "mixed"
  artStyles: string[]
  deliverables: string[]
  requirements: string[]
  timeline: string
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
      "We are a small indie press with a three-book fantasy series set in a blocky, Minecraft-inspired world, and we want the covers to feel like a single collectible set. Each cover shows one hero moment from the book: a lone traveller at a cliff edge, a village lit by torches, a dragon over a pixel sea.\n\nWe will send the manuscript summary, character notes and a colour mood for each book. You send a rough thumbnail first, then a detailed sketch, then final art. We care most about readable silhouettes at thumbnail size, because the covers will sit in small store listings.",
    category: "Book cover",
    medium: "digital",
    artStyles: ["Pixel art", "Fantasy", "Low-Poly Art"],
    deliverables: [
      "Three front covers at 1600 x 2560 px, one per book",
      "A wide banner crop of each cover for the store page",
      "Layered source files (PSD or Aseprite)",
      "Two rounds of changes per cover",
    ],
    requirements: [
      "A portfolio with finished pixel art scenes, not only sprites",
      "Comfort with limited palettes (32 colours or fewer)",
      "Able to take art direction and send work in progress",
    ],
    timeline: "12 weeks, one cover every 4 weeks",
    posterName: "Anna Stacy Huh",
    jobType: "full_time",
    payAmount: 200,
    payUnit: "Cover",
  },
  {
    title: "Mystery Thriller Book Cover Design",
    summary: "Graphic designer sought for a gripping mystery thriller series cover",
    description:
      "A thriller series needs a consistent look from book to book: dark palettes, bold type and one striking central image per cover. Think a single object or a lone figure, lots of negative space, a title you can read from across a room.\n\nThis is part-time work spread over a few weeks. We will share the blurbs and a few reference covers we like and a few we do not. You propose two directions for the first book; once we pick one, the rest of the series follows the same grid.",
    category: "Book cover",
    medium: "digital",
    artStyles: ["Typography", "Photo manipulation", "Minimal"],
    deliverables: [
      "Two cover directions for book one, then the chosen one finished",
      "A reusable template for the rest of the series",
      "Print-ready PDF (with bleed) and an e-book JPG for each cover",
    ],
    requirements: [
      "Strong typography; show us covers or posters where the title carries the design",
      "Experience preparing files for print",
      "Comfortable with dark, moody colour",
    ],
    timeline: "5 weeks, about 10 hours a week",
    posterName: "Liam Rodriguez",
    jobType: "part_time",
    payAmount: 150,
    payUnit: "Cover",
  },
  {
    title: "Sci-Fi Graphic Novel Illustrations",
    summary: "Illustrator needed for a futuristic sci-fi graphic novel",
    description:
      "Full-page and spot illustrations for a futuristic graphic novel about a salvage crew on a dying orbital station. You will work from a script and character sheets, and we review sketches before final art so nothing is wasted.\n\nThe look is clean linework with painterly colour and strong lighting: neon against steel, small figures in huge rooms. Pages are reviewed in batches of five.",
    category: "Illustration",
    medium: "digital",
    artStyles: ["Digital painting", "Concept art", "Sci-fi"],
    deliverables: [
      "40 full-page illustrations and about 25 spot illustrations",
      "Sketch and flat-colour approval stages for every batch",
      "Final files at 300 dpi, A5 trim size",
    ],
    requirements: [
      "Examples of environments and figures in the same image",
      "Reliable pace: five finished pages every two weeks",
      "Able to keep characters consistent across many pages",
    ],
    timeline: "5 months in batches of five pages",
    posterName: "Sophie Chen",
    jobType: "contract",
    payAmount: 250,
    payUnit: "Illustration",
  },
  {
    title: "Romantic Comedy E-Book Cover",
    summary: "Designer required for a lighthearted romantic comedy e-book cover",
    description:
      "One bright, playful cover for a romantic comedy e-book, in a flat illustrated style: two characters, a coffee shop, warm colours and a hand-lettered title. The tone is cosy and a little silly, never glossy.\n\nWe will give you the blurb, the characters' looks and three covers we admire. Two rounds of changes are included.",
    category: "Book cover",
    medium: "digital",
    artStyles: ["Flat colour", "Cartoon art", "Hand lettering"],
    deliverables: ["One e-book cover at 1600 x 2560 px", "A square version for social posts", "Source file"],
    requirements: [
      "Flat, friendly illustration with warm palettes",
      "Hand lettering or custom title type",
    ],
    timeline: "2 weeks",
    posterName: "James Patel",
    jobType: "freelance",
    payAmount: 100,
    payUnit: "Cover",
  },
  {
    title: "Character Designs for a Card Game",
    summary: "Cartoon artist wanted for twelve original card game characters",
    description:
      "A tabletop card game needs twelve original characters with clear silhouettes and strong colour. We supply short descriptions (a grumpy baker, a wizard who is afraid of birds); you supply the look, the poses and the personality.\n\nCharacters appear on cards about 6 cm tall, so shapes must read small. Expressions matter more than detail.",
    category: "Character design",
    medium: "digital",
    artStyles: ["Cartoon art", "Character design", "Vector"],
    deliverables: [
      "Twelve full-colour characters, one pose each",
      "Two alternate expressions per character",
      "Transparent PNG and vector source for every character",
    ],
    requirements: [
      "A portfolio of original characters with different body shapes",
      "Bold outlines and flat or cel shading",
    ],
    timeline: "6 weeks, two characters a week",
    posterName: "Maya Okafor",
    jobType: "freelance",
    payAmount: 80,
    payUnit: "Character",
  },
  {
    title: "Animated Logo Loop",
    summary: "Animator needed for a short looping logo for a podcast",
    description:
      "A three-second looping animation of an existing logo, delivered as a video and a GIF. The motion should be simple and satisfying: the logo breathes, a sound-wave ripples through it and it settles back to the first frame so the loop is seamless.\n\nWe will send the logo as vector art and a few reference loops. Polished timing matters more than complexity.",
    category: "Animation",
    medium: "digital",
    artStyles: ["Animations", "Motion graphics", "Minimal"],
    deliverables: ["A 3-second seamless loop as MP4 (1080 x 1080)", "The same loop as a GIF under 5 MB", "The project file"],
    requirements: ["Show us at least one seamless loop you made", "Comfort with After Effects or similar"],
    timeline: "1 week",
    posterName: "Daniel Reyes",
    jobType: "contract",
    payAmount: 300,
    payUnit: "Loop",
  },
  {
    title: "Weekly Webcomic Panels",
    summary: "Comic artist for a weekly four-panel webcomic",
    description:
      "A weekly four-panel comic with a steady cast of five characters and a gentle, deadpan sense of humour. Scripts arrive on Mondays and finished panels are due by Friday, so we need someone who is happy to work to a steady rhythm.\n\nThe style is loose ink linework with a limited watercolour wash. You can draw on paper and scan, or imitate the look digitally.",
    category: "Comics",
    medium: "mixed",
    artStyles: ["Ink linework", "Watercolour", "Cartoon art"],
    deliverables: ["One four-panel strip every week", "Clean lettering with speech balloons", "Print-resolution scans or exports (600 dpi)"],
    requirements: ["Past comic strips or sequential work", "A reliable weekly schedule", "Consistent character drawing"],
    timeline: "Ongoing, 12 strips to start",
    posterName: "Ines Moreau",
    jobType: "part_time",
    payAmount: 120,
    payUnit: "Strip",
  },
  {
    title: "Profile Pictures for a Community",
    summary: "Pfp artist needed for a set of twenty community avatars",
    description:
      "Twenty matching profile pictures for an online art community, all on the same grid and palette so they look like a set when displayed side by side. Each avatar is a bust with a different hat, hair or accessory, on a flat coloured background.\n\nWe will give you the palette (eight colours) and a list of traits. Variety comes from the traits, not from changing the style.",
    category: "Avatars",
    medium: "digital",
    artStyles: ["Pixel art", "Flat colour", "Indie art"],
    deliverables: ["Twenty avatars at 512 x 512 px", "A single sheet showing the whole set", "Source files with traits on separate layers"],
    requirements: ["Strictly consistent style across a series", "Experience with pixel or flat vector avatars"],
    timeline: "3 weeks",
    posterName: "Tunde Bello",
    jobType: "full_time",
    payAmount: 60,
    payUnit: "Avatar",
  },
  {
    title: "Clay Mascot Sculptures",
    summary: "Sculptor needed for three handmade clay mascots for a bakery",
    description:
      "A neighbourhood bakery wants three small hand-sculpted mascots (a bun, a croissant and a pretzel, each with a face) to sit by the till and appear in photos on its website. They should feel chunky, friendly and slightly wonky, clearly made by hand.\n\nYou sculpt in polymer or air-dry clay, paint and seal them, and photograph each one from four angles so we can use them online. Pieces are about 12 cm tall.",
    category: "Sculpture",
    medium: "sculpture",
    artStyles: ["Sculptures", "Handmade", "Cartoon art"],
    deliverables: [
      "Three finished, painted and sealed clay sculptures, about 12 cm tall",
      "Four photos of each on a plain background",
      "Safe packaging and delivery to the bakery",
    ],
    requirements: [
      "Photos of clay or small sculpture work you have made",
      "Based within a day's travel of the bakery, or happy to ship insured",
      "Smooth, durable paint finish",
    ],
    timeline: "4 weeks, with a photo check-in after the first sculpture",
    posterName: "Rosa Lindqvist",
    jobType: "contract",
    payAmount: 180,
    payUnit: "Sculpture",
  },
  {
    title: "Paper Cut Window Display",
    summary: "Paper artist for a layered paper-cut display of a forest scene",
    description:
      "A children's bookshop wants a layered paper-cut forest for its front window: tall trees, a fox, owls and a winding path, built in five depth layers so it casts soft shadows when lit from behind.\n\nYou design the scene, cut and assemble it in a frame about 90 x 60 cm, and install it in the shop. Colours stay within a warm autumn palette; the paper must be acid-free so it lasts the season.",
    category: "Paper craft",
    medium: "paper",
    artStyles: ["Paper cut", "Layered", "Illustration"],
    deliverables: [
      "A sketch and colour plan for approval before cutting",
      "One framed, five-layer paper-cut scene, about 90 x 60 cm",
      "Installation in the shop window, and a photo set for the shop's social pages",
    ],
    requirements: [
      "Examples of layered paper-cut or paper-craft pieces",
      "Experience framing or mounting delicate work",
    ],
    timeline: "5 weeks, installation in week 5",
    posterName: "Pieter van Dijk",
    jobType: "freelance",
    payAmount: 400,
    payUnit: "Display",
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
