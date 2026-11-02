# Gamora: Build Guide (Artist Side)

Nov 2, 2026 · @Abuelo

## How to use this guide

This guide takes you from an empty folder to a deployed, secure portfolio app where visitors can sign up, post art and apply to sample jobs. Follow the sections in order: environment first, then folder structure, then Claude Code setup, then the build phases.

Scope of the build:

| Real in the app | Shown as unavailable (Coming soon) |
| --- | --- |
| Sign up, sign in, profile, interests | Hirer accounts and role |
| Posting images, feed, like, comment, repost, bookmark, follow | Shop, wallet, subscriptions, payments |
| Profile pages, search, activity | Chat and messages |
| Job wall, job detail, apply with your works (sample jobs are seeded) | Posting jobs, applicants, hiring |
| Settings: appearance (five themes), edit profile, sign out | Stats, locked subscribed posts |

Rules Claude Code follows in this project:

- Screens are built from Figma through the Figma MCP, using the build-screen skill. Components use the build-component skill.
- Icons come only from the dedicated SVG folder. Claude never invents icons.
- Claude never reads or edits env files, and never pushes code unless you ask it to create a pull request.
- Every phase ends with a push checkpoint (Section 7) before the next phase starts.
- Every server action checks the session and validates its input. Middleware is never the only protection.

Working loop for each phase: tell Claude which phase to build, check the result in the browser, run the checkpoint checklist, then ask Claude to create the pull request.

Figma file for this project: \[paste the Figma file URL here\]

## Section 1: Environment, database and dependencies

Do all of this before writing any app code. At the end you have a Neon database, installed dependencies, a validated `.env.local`, and a health route that proves the database connects.

### Accounts to create (free tiers, check current limits)

- GitHub (the repository)
- Vercel (hosting, plus a Blob store for image uploads)
- Neon (Postgres)
- Google Cloud (OAuth client for Google sign-in)
- Upstash (Redis, used for rate limiting)

### Step 1: Create the project

```bash
mkdir gamora && cd gamora
git init -b main
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Create-next-app's default `.gitignore` ignores `.env*`, which also ignores `.env.example`. Add this line at the end of `.gitignore` so the example file is committed:

```
!.env.example
```

### Step 2: Install dependencies

```bash
# core
npm i zod server-only motion
# database
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit dotenv tsx
# auth
npm i better-auth
# uploads and image processing
npm i @vercel/blob sharp
# rate limiting
npm i @upstash/ratelimit @upstash/redis
# turn Figma SVG exports into React components
npm i -D @svgr/cli
# UI: answer the prompts, then add the pieces used by the screens
npx shadcn@latest init
npx shadcn@latest add drawer dialog alert-dialog dropdown-menu tabs
```

### Step 3: Create the Neon database

1. In Neon, create a project in the region closest to your Vercel functions and your users.
2. Copy two connection strings from the dashboard. The pooled one (host contains `-pooler`) is for the app. The direct one is for migrations.
3. Do not enable Neon Auth. Sign-in is handled by Better Auth.

### Step 4: Environment variables

| Variable | Where it comes from | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled connection string | App queries |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string | Migrations with drizzle-kit |
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` | Signing sessions. Use a different value in production |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally, your Vercel URL in production | Auth base URL |
| `NEXT_PUBLIC_APP_URL` | Same value as `BETTER_AUTH_URL` | Trusted origin and absolute links |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud credentials | Google sign-in |
| `BLOB_READ_WRITE_TOKEN` | Vercel project, Storage, Blob | Image uploads |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash database page | Rate limiting |
| `ADMIN_EMAILS` | Your email, comma separated for more | Marks admins at sign-up |

Create `.env.local` yourself and fill it in. Claude never opens this file (Section 3 blocks it). Commit only the template below as `.env.example`:

```bash
# .env.example (names only, never real values)
DATABASE_URL=
DATABASE_URL_UNPOOLED=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BLOB_READ_WRITE_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_EMAILS=
```

### Step 5: Validate env vars at startup

Keep server and client variables in separate files so server secrets can never be imported into browser code.

```ts
// src/lib/env.server.ts
import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  ADMIN_EMAILS: z.string().default(""),
});

export const env = schema.parse(process.env);
```

```ts
// src/lib/env.client.ts
import { z } from "zod";

export const clientEnv = z
  .object({ NEXT_PUBLIC_APP_URL: z.string().url() })
  .parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL });
```

### Step 6: Database connection and Drizzle config

```ts
// src/server/db/index.ts
import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env.server";

export const db = drizzle(neon(env.DATABASE_URL), { schema });
```

```ts
// drizzle.config.ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
```

Add these to the `scripts` section of `package.json`:

```json
"typecheck": "tsc --noEmit",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:seed": "tsx --env-file=.env.local scripts/seed.ts",
"icons": "svgr --out-dir src/components/icons --typescript --icon -- src/assets/svgs"
```

### Step 7: Google OAuth

1. In Google Cloud, open APIs and Services, then OAuth consent screen. Choose External, fill in the app name and support email, and keep the default scopes (email, profile, openid).
2. Open Credentials, then Create credentials, then OAuth client ID, type Web application.
3. Add these authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://YOUR-PROJECT.vercel.app/api/auth/callback/google`.
4. Copy the client ID and secret into `.env.local`.
5. While the consent screen is in Testing, only emails listed as test users can sign in. Publish the app before inviting friends.

### Step 8: Upstash and Blob

- Upstash: create a Redis database and copy the REST URL and token.
- Blob: in your Vercel project, open Storage, create a Blob store, and copy its read-write token. You can also run `vercel env pull .env.local` yourself in the terminal to fetch Vercel's values. Do that outside Claude Code.

### Step 9: Add the same variables to Vercel

In the Vercel dashboard, add every variable from the table to the Production environment. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production URL, and generate a new `BETTER_AUTH_SECRET` for production.

### Step 10: Prove it works

```ts
// src/app/api/health/route.ts
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export async function GET() {
  await db.execute(sql`select 1`);
  return Response.json({ ok: true });
}
```

Run `npm run dev` and open `/api/health`. You should see `{"ok":true}`. If env validation fails, the error names the missing variable.

**Push checkpoint 1:** run the checklist in Section 7, then commit as `chore: project setup, env validation and database connection`.

## Section 2: Folder structure

Create the whole structure first, empty, so every later file has an obvious home. The code is split into four layers, and code only ever calls the layer below it: routes in `app/`, UI in `components/`, mutations in `server/actions/`, and database logic in `server/services/`.

```
gamora/
├── .claude/
│   ├── settings.json                # permissions (Section 3)
│   └── skills/
│       ├── build-screen/SKILL.md
│       └── build-component/SKILL.md
├── CLAUDE.md                        # project rules for Claude Code
├── .env.example                     # names only, committed
├── drizzle/                         # generated migrations
├── drizzle.config.ts
├── next.config.ts                   # security headers
├── docs/build-log.md                # one entry per finished phase
├── scripts/seed.ts                  # sample jobs and demo content
└── src/
    ├── middleware.ts                # named proxy.ts on newer Next.js
    ├── app/
    │   ├── layout.tsx, globals.css, not-found.tsx, error.tsx
    │   ├── (public)/                # no login needed
    │   │   ├── page.tsx             # splash / landing
    │   │   ├── terms/  privacy/
    │   ├── (auth)/
    │   │   ├── sign-in/  sign-up/
    │   │   └── onboarding/ (role, profile, avatar, interests)
    │   ├── (app)/                   # protected, phone-frame layout
    │   │   ├── layout.tsx           # session check, top nav, bottom nav
    │   │   ├── feed/  post/[id]/  create/
    │   │   ├── search/  activity/  bookmarks/
    │   │   ├── jobs/  jobs/[id]/
    │   │   ├── u/[username]/
    │   │   ├── settings/ (profile, appearance)
    │   │   └── unavailable/[feature]/   # shop, wallet, chat, hirer tools
    │   ├── (admin)/admin/reports/   # admin only
    │   └── api/
    │       ├── auth/[...all]/route.ts
    │       ├── upload/route.ts
    │       └── health/route.ts
    ├── components/
    │   ├── ui/                      # shadcn primitives
    │   ├── icons/                   # GENERATED from assets/svgs, never edited by hand
    │   ├── layout/                  # phone-frame, top-nav, bottom-nav
    │   ├── shared/                  # avatar, logo, coming-soon, empty-state, skeletons
    │   ├── feed/  jobs/  profile/  onboarding/
    ├── assets/
    │   ├── svgs/                    # raw icons exported from Figma
    │   └── logo/                    # logo facets for the origami animation
    ├── server/                      # backend, every file starts with import "server-only"
    │   ├── db/  (index.ts, schema/, seed-data/)
    │   ├── auth/  (auth.ts, session.ts)
    │   ├── services/                # database logic per domain
    │   ├── actions/                 # server actions per domain
    │   ├── validators/              # zod schemas per domain
    │   ├── security/                # rate-limit, upload-guard, sanitize
    │   └── storage/                 # blob upload helpers
    ├── lib/                         # env.server.ts, env.client.ts, utils.ts, constants.ts
    ├── hooks/
    ├── styles/themes.css            # the five themes as CSS variables
    └── types/
```

### Layer rules

| Layer | Folder | May import from | Never does |
| --- | --- | --- | --- |
| Routes | `app/` | components, server/services (reads), server/actions | Contain database queries inline |
| UI | `components/` | ui, icons, hooks, lib | Import from `server/db` or read secrets |
| Mutations | `server/actions/` | validators, security, auth, services | Skip the session check or input validation |
| Data | `server/services/` | db, storage | Trust input that was not validated upstream |

### Scaffold script

Run this once from the project root. It creates the empty folders and placeholder files, so Claude Code starts from a finished structure.

```bash
mkdir -p .claude/skills/build-screen .claude/skills/build-component docs scripts drizzle
mkdir -p "src/app/(public)/terms" "src/app/(public)/privacy"
mkdir -p "src/app/(auth)/sign-in" "src/app/(auth)/sign-up"
mkdir -p "src/app/(auth)/onboarding/role" "src/app/(auth)/onboarding/profile" "src/app/(auth)/onboarding/avatar" "src/app/(auth)/onboarding/interests"
mkdir -p "src/app/(app)/feed" "src/app/(app)/post/[id]" "src/app/(app)/create"
mkdir -p "src/app/(app)/search" "src/app/(app)/activity" "src/app/(app)/bookmarks"
mkdir -p "src/app/(app)/jobs/[id]" "src/app/(app)/u/[username]"
mkdir -p "src/app/(app)/settings/profile" "src/app/(app)/settings/appearance"
mkdir -p "src/app/(app)/unavailable/[feature]" "src/app/(admin)/admin/reports"
mkdir -p "src/app/api/auth/[...all]" src/app/api/upload src/app/api/health
mkdir -p src/components/{ui,icons,layout,shared,feed,jobs,profile,onboarding}
mkdir -p src/assets/{svgs,logo}
mkdir -p src/server/{db/schema,db/seed-data,auth,services,actions,validators,security,storage}
mkdir -p src/{lib,hooks,styles,types}
touch .claude/settings.json CLAUDE.md .env.example docs/build-log.md scripts/seed.ts
touch .claude/skills/build-screen/SKILL.md .claude/skills/build-component/SKILL.md
touch src/styles/themes.css src/server/db/schema/index.ts
find src -type d -empty -exec touch {}/.gitkeep \;
```

### The dedicated SVG folder

After the structure exists, you add icons from Figma. Claude Code never draws icons itself.

1. In Figma, select an icon, export it as SVG, and save it into `src/assets/svgs/` with a lowercase kebab-case name such as `heart.svg` or `bell-filled.svg`.
2. Icons that change color with the theme must use `currentColor`. If your Figma export has a fixed color like `#111111`, add this to the `icons` script in `package.json`: `--replace-attr-values "#111111=currentColor"`.
3. Run `npm run icons`. It generates one React component per SVG in `src/components/icons/`. Do not edit those files by hand.
4. Use them as `<HeartIcon className="size-6" />`. If a screen needs an icon that does not exist yet, Claude lists the missing icon names and waits for you to add them.

The animated origami logo lives apart from the icon set. Keep its facet shapes in `src/assets/logo/` and build the animated component by hand in `components/shared/logo.tsx`.

**Push checkpoint 2:** after the scaffold runs, commit as `chore: scaffold folder structure`.

## Section 3: Claude Code setup

Three files control how Claude Code behaves in this project: `.claude/settings.json` (what it may do), `CLAUDE.md` (the project rules), and the two skills in Sections 4 and 5. Put the first two in place before asking Claude to build anything.

### .claude/settings.json

```json
{
  "permissions": {
    "allow": [
      "Read(./.env.example)",
      "Bash(npm run:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git checkout:*)",
      "Bash(git switch:*)",
      "Bash(git branch:*)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(gh pr create:*)",
      "Bash(gh pr merge:*)",
      "Bash(git reset --hard:*)",
      "Bash(npm install:*)",
      "Bash(npm i:*)",
      "Bash(npx drizzle-kit migrate:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Read(./.env.development)",
      "Read(./.env.production)",
      "Read(./.env.test)",
      "Read(./.env.*.local)",
      "Read(**/.env)",
      "Read(**/.env.local)",
      "Edit(./.env)",
      "Edit(./.env.local)",
      "Edit(./.env.development)",
      "Edit(./.env.production)",
      "Edit(./.env.*.local)",
      "Bash(cat *.env*)",
      "Bash(less *.env*)",
      "Bash(head *.env*)",
      "Bash(tail *.env*)",
      "Bash(grep *.env*)",
      "Bash(rg *.env*)",
      "Bash(source *.env*)",
      "Bash(printenv:*)",
      "Bash(env)",
      "Bash(vercel env:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git push origin main:*)",
      "Bash(git push origin master:*)",
      "Bash(git push --delete:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

How the push rule works: Claude Code cannot tell why it wants to push, so a rule that reads "deny unless asked for a PR" cannot be written directly. Instead, `git push` sits under `ask`, so Claude can never push silently. A prompt appears, and you approve it only when you asked Claude to create the pull request. Force pushes and pushes to `main` are denied outright. If you want a hard block, move `Bash(git push:*)` from `ask` to `deny` and push the branch yourself before asking for the PR.

The allow list leaves `.env.example` readable, which is why the deny list names the real env files one by one instead of using `.env*`.

### What these rules cannot do

- Deny rules on shell commands match the command text. A determined workaround such as `node -e` or `python -c` reading the file is not caught, so treat the rules as guard rails, not a vault.
- Keep local values separate from production. Use a Neon dev branch and test OAuth credentials in `.env.local`, and keep production secrets only in Vercel.
- Rule syntax changes between Claude Code versions. Check the [Claude Code settings reference](https://docs.claude.com/en/docs/claude-code/settings) and run `/permissions` inside Claude Code to confirm every rule shows up as expected.
- Test it once: ask Claude to "read .env.local". It should be refused.

### CLAUDE.md

Save this at the project root. Replace the Figma URL.

```markdown
# Gamora

Public portfolio app for artists: sign up, post art, browse a feed, apply to sample jobs.
Only the artist side is real. Hirer, shop, wallet, chat and subscription screens render the ComingSoon screen.

## Stack
Next.js (App Router, TypeScript), Tailwind, shadcn/ui (Radix, vaul), Motion, Better Auth, Drizzle + Neon Postgres, Vercel Blob, Upstash rate limiting, Zod.

## Layers
app/ (routes) -> components/ (UI) -> server/actions (mutations) -> server/services (data) -> server/db.
Files in src/server start with import "server-only". Components never import from server/db.

## Commands
npm run dev | lint | typecheck | build | db:generate | db:migrate | db:seed | icons

## Figma
File: [paste URL]. Read screens with the Figma MCP. Use the build-screen skill for screens and the build-component skill for components.

## Hard rules
1. Never read, print, edit or copy env files (.env, .env.local, .env.production). Use .env.example for variable names only. If a value is needed, ask the user.
2. Never run git push unless the user asked to create a pull request. Never force push. Never push to main.
3. Icons come only from src/components/icons (generated from src/assets/svgs). Never inline new SVGs. If an icon is missing, list its name and stop.
4. No hardcoded colors, spacing or fonts. Use the theme tokens in src/styles/themes.css.
5. Every server action: validate with Zod, check the session with requireUser(), check ownership, rate limit, then write.
6. Never use dangerouslySetInnerHTML. Never build SQL from strings.
7. No new dependency without telling the user why.

## Done means
typecheck, lint and build pass; the screen matches Figma at 390px width in all five themes; loading, empty and error states exist; a line is added to docs/build-log.md.

## Git
One branch per phase: feat/phase-N-name. Conventional commits (feat:, fix:, chore:). Commit locally when asked. Stop at the checkpoint and wait.
```

## Section 4: Skill, build-screen

This skill turns a Figma screen into a working page. Claude reads the design through the Figma MCP, reuses what already exists, builds only what is missing, and shows a Coming soon screen for features that are not available yet.

Setup:

1. Connect the Figma MCP to Claude Code. Use the install steps in Figma's own MCP guide, since the command changes over time. The Figma server's address at the time of writing is `https://mcp.figma.com/mcp`.
2. Save the text below as `.claude/skills/build-screen/SKILL.md`.
3. Use it by typing: `Use build-screen on <Figma node URL>`.

```markdown
---
name: build-screen
description: Build or update a screen from a Figma design using the Figma MCP. Use when the user gives a Figma link or node ID, or names a screen from the build guide to implement. Reuses existing components, builds missing ones with build-component, and shows Coming soon for unavailable features.
---

# build-screen

Build one screen at a time. Follow the steps in order. Never push to git.

## 1. Read the design
1. Get the file key and node ID from the Figma URL (URLs write the node ID with "-", the API uses ":").
2. Follow the Figma MCP server's own instructions (open a session first if it asks). Load the figma-design-to-code skill, if available, before calling get_design_context.
3. Call get_design_context for the node, get_screenshot for a visual reference, and get_variable_defs for tokens. Treat the output as a reference to adapt, not final code.
4. If the node has several states, list them (default, loading, empty, error, locked) before coding.

## 2. Plan before writing
Write a short plan in the reply: route path, components needed, data needed, states. Ask only if something is ambiguous; otherwise continue.
- Route: place it under the right group in src/app: (public), (auth), (app) or (admin).
- Availability: real artist-side features get built. Hirer tools, shop, wallet, chat, subscriptions and stats render the ComingSoon component for that feature. Do not build the Figma screen for them.

## 3. Inventory components
For every element in the design, search src/components first (ui, shared, layout, feed, jobs, profile, onboarding).
- Exists and fits: reuse it.
- Exists but needs a variant: extend it and keep every existing usage working.
- Missing: build it with the build-component skill before the screen. Report each new component.

## 4. Icons and images
- Use only icons from src/components/icons. Never paste SVG markup into a component.
- Missing icon: leave a clearly marked TODO, add its name to the "Missing icons" list in the final reply, and continue. Do not draw a substitute.
- Artwork and avatars come from the database or seed data, never from URLs copied out of the design.

## 5. Styling
- Use theme tokens (CSS variables in src/styles/themes.css, through Tailwind classes). No hex values and no arbitrary colors.
- Spacing scale 4, 8, 12, 16, 20, 24, 32, 40, 48. Radius 8, 16, 24 or full.
- Use the defined text styles: Poppins for all text (Regular 400, Medium 500, SemiBold 600; buttons are Poppins Medium 15/22). Geom only for the GAMORA wordmark (type/display).
- Mobile-first at 390px width. On desktop the screen renders inside the phone frame.
- It must look right in all five themes: light, dark, black, blue, cream.

## 6. Data and actions
- Server components fetch through src/server/services. No queries inside components or pages.
- Mutations go through src/server/actions: validate with the Zod schema in src/server/validators, call requireUser(), check ownership, rate limit, then call the service.
- Never log secrets, expose other users' emails, or return raw errors to the client.

## 7. States and accessibility
- Build loading (skeleton), empty, error and, where the design shows it, locked states.
- Use real button, a, input and label elements. Touch targets at least 44px. Icon-only buttons need aria-label. Text contrast at least 4.5:1 in every theme.

## 8. Verify
1. Run typecheck, lint and build. Fix every error.
2. Run the dev server and compare against the Figma screenshot at 390px width. Fix visible differences.
3. Check all five themes, plus the empty and loading states.

## 9. Report
Reply with: files created or changed, components reused versus created, missing icons, deviations from the design and why, and what the user must do next. Add one line to docs/build-log.md. Then stop. Do not commit or push unless the user asks.
```

## Section 5: Skill, build-component

This skill builds one reusable component. It always checks for an existing one first, so the library stays small and consistent. build-screen calls it whenever a design needs something that does not exist yet.

Save the text below as `.claude/skills/build-component/SKILL.md`. Use it by typing: `Use build-component for <Figma node URL or description>`.

```markdown
---
name: build-component
description: Build or extend a reusable UI component from a Figma node or a description. Use when a screen needs a component that does not exist yet, or an existing component needs a new variant. Searches existing components first.
---

# build-component

Build one component at a time. Never push to git.

## 1. Search first
Search src/components/ui, shared, layout, feed, jobs, profile and onboarding for anything similar (by name, purpose and look).
- Same thing exists: reuse it and stop.
- Close match: add a variant or prop to it. Keep every existing usage working and check each one.
- Nothing similar: continue.

## 2. Read the design
If a Figma node is given, follow the Figma MCP server's instructions (open a session first if it asks), load the figma-design-to-code skill if available, then call get_design_context, get_screenshot and get_variable_defs. List every variant and state shown (default, hover, pressed, focus, disabled, loading, selected, error).
If there is no Figma node, build from the description using the existing tokens and nearest components so it fits the rest of the app.

## 3. Decide where it lives
- src/components/ui: generic primitives (button, input, chip, avatar, sheet, toast). Build on shadcn/Radix primitives where one exists.
- src/components/shared: used across features (empty-state, coming-soon, report-sheet, logo).
- src/components/layout: app frame, bottom nav, top bar, phone frame.
- src/components/<feature>: used by one feature only (feed, jobs, profile, onboarding).
One component per file, kebab-case file name, PascalCase export.

## 4. Build it
- TypeScript props with a clear interface. No any.
- Variants through class-variance-authority. Forward className, merge with the cn helper.
- Colors, radius, spacing and fonts from theme tokens only. No hex and no arbitrary values.
- Icons only from src/components/icons. List missing icons in the report instead of drawing them.
- Components do not fetch data and do not call the database. They receive props and callbacks. Interactive ones are client components ("use client") only when they need state or events.
- Animations use motion/react, short (150 to 300ms), and respect prefers-reduced-motion.
- Render user text as plain text. Never use dangerouslySetInnerHTML.

## 5. Accessibility
- Correct element (button, a, input, label). Keyboard reachable with a visible focus ring.
- Touch target at least 44px. Icon-only controls need aria-label.
- Dialogs, sheets and menus use Radix or vaul so focus trapping and Escape work.
- Contrast at least 4.5:1 in all five themes.

## 6. Verify
1. Run typecheck and lint.
2. Render every variant and state once (temporary page or Storybook-style test route, deleted afterwards).
3. Check all five themes and a long-text case.
4. Compare against the Figma screenshot.

## 7. Report
Reply with: the file path, props, variants, anything reused instead of rebuilt, missing icons, and any existing component you changed (and where it is used). Add one line to docs/build-log.md. Do not commit or push unless the user asks.
```

## Section 6: Auth and middleware

Auth is real: people sign up with email and password or Google, and every post belongs to a real account. Protection comes in four layers, so a mistake in one does not expose anything.

| Layer | Where | What it does |
| --- | --- | --- |
| 1. Middleware | `src/middleware.ts` (`proxy.ts` on Next.js 16) | Fast check for a session cookie. Redirects signed-out visitors away from private routes. This is a convenience only, never the real protection. |
| 2. Layout check | `app/(app)/layout.tsx` | Loads the real session on the server. No valid session means redirect to sign-in. |
| 3. Action check | every server action | Calls `requireUser()` before doing anything. |
| 4. Ownership check | every edit or delete | Confirms the row belongs to the signed-in user (or the user is an admin). |

Why not middleware alone: middleware has had bypass bugs in the past, and it only sees a cookie, not a verified session. Keep Next.js updated and treat layers 2 to 4 as the real gate.

### 6.1 Better Auth server config

File: `src/server/auth/index.ts`

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { env } from "@/lib/env.server";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // portfolio: no email service
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()], // keep this last
});
```

Notes: Better Auth already sets httpOnly and sameSite cookies and applies its own rate limits on the auth endpoints. Check the current Better Auth docs for option names if one has changed, since the library moves quickly. Because email is not verified, never treat an email address as proof of identity for anything important, and do not auto-link accounts by email beyond what Better Auth does by default.

### 6.2 Client and route handler

File: `src/lib/auth-client.ts`

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

File: `src/app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/server/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 6.3 Generate the auth tables

Better Auth needs user, session, account and verification tables. Generate the Drizzle schema with its CLI, review it, then migrate:

```bash
npx @better-auth/cli generate --output src/server/db/schema/auth.ts
npm run db:generate
npm run db:migrate
```

If the CLI name or flags have changed, check the Better Auth docs. Add your own columns to the profile table, not the auth `user` table: username, bio, role (artist), avatar URL, interests, `isAdmin` boolean. Export everything from `src/server/db/schema/index.ts`.

### 6.4 Middleware

File: `src/middleware.ts` (rename to `src/proxy.ts` and the export to `proxy` on Next.js 16)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/terms", "/privacy"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth");
  const hasSession = !!getSessionCookie(request);

  if (!hasSession && !isPublic) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname); // validated later, see below
    return NextResponse.redirect(url);
  }
  if (hasSession && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
```

Browsing rule to decide: should signed-out visitors be able to read the feed? For a portfolio, yes is friendlier, so add `/feed`, `/post/` and `/u/` to the public list and require sign-in only to post, like, comment and follow. Either way, the server actions enforce sign-in.

Open redirect: when you read the `next` parameter after sign-in, only accept a value that starts with a single `/` and not `//`. Otherwise go to `/feed`.

### 6.5 Session helpers

File: `src/server/auth/session.ts`

```ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import { env } from "@/lib/env.server";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const admins = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  if (!admins.includes(user.email.toLowerCase())) redirect("/feed");
  return user;
}
```

Because email is unverified, a stricter version of `requireAdmin` should also check an `isAdmin` flag you set directly in the database for your own account. Use that flag once it exists and keep `ADMIN_EMAILS` only for the first setup.

In server actions, a thrown redirect is fine for pages, but for actions called from client code return a typed result such as `{ ok: false, error: "unauthorized" }` and let the client show the sign-in sheet.

### 6.6 Layout guard

File: `src/app/(app)/layout.tsx` calls `getSession()` and redirects when it is empty, unless the route is on your public list. Put the guard in the layout of every private group, so a new page inside it is protected by default.

### 6.7 Ownership rule

Every update or delete query includes the owner in the where clause, never a lookup followed by an unchecked write:

```ts
await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, user.id)));
```

Check the number of rows affected. Zero means not found or not yours, and the response is the same for both.

### 6.8 Sign-up and onboarding flow

1. `/sign-up`: email and password, or Google. Generic error messages ("Could not create account"), never reveal whether an email exists.
2. `/onboarding/role`: artist is the only active choice. Hirer shows Coming soon.
3. `/onboarding/profile`: username (3 to 20 chars, lowercase letters, numbers, underscore, unique, reserved words blocked such as admin, api, settings), display name, bio (max 160).
4. `/onboarding/avatar` and `/onboarding/interests`: both skippable.
5. Until onboarding is done, the layout redirects any signed-in user without a profile row to `/onboarding/role`.

Checks for this phase: sign up, sign out, sign in, refresh (session persists), open a private URL while signed out (redirected), open the feed signed in, try a wrong password five times (rate limited), and try a username that is already taken.

Push checkpoint: follow the recipe in Section 7 with the message `feat: authentication, middleware and onboarding`.

## Section 7: Build phases and push checkpoints

Each phase ends with a push checkpoint. Work on a branch, never on main. Because `git push` is set to ask in settings.json, and pushes to main are denied, the flow is: Claude commits on the branch, you ask it to create the pull request, you approve the push prompt, then you merge on GitHub.

### 7.1 The checkpoint recipe (same every time)

1. Run the checks. All must pass: `npm run typecheck`, `npm run lint`, `npm run build`.
2. Confirm no env file is staged: `git diff --cached --name-only | grep -E '\.env'` should print only `.env.example` or nothing. If `.env.local` ever appears, stop and unstage it.
3. Confirm no secret is in the changes: search the diff for `sk_`, `secret`, `token`, `postgres://`.
4. Branch: `git switch -c feat/phase-N-name` (once per phase).
5. Commit with a conventional message (for example `feat: posts and feed`). Ask Claude to write it, ending with its usual attribution lines.
6. Say: `Create the pull request.` Claude runs the push and `gh pr create`. Approve the permission prompt when it appears.
7. Open the Vercel preview link on the PR. Smoke test: sign in, do the main thing from this phase, check a second theme.
8. Merge the PR on GitHub, delete the branch, then locally `git switch main && git pull`.
9. Add two lines to `docs/build-log.md`: what shipped, what is next.

If a check fails, fix it before step 4. Never skip the preview test, because production-only problems show up there.

### 7.2 Phases

| Phase | Goal | Done when | Commit message |
| --- | --- | --- | --- |
| 0 | Scaffold folders (Section 2) | Tree exists, app still runs | `chore: scaffold folder structure` |
| 1 | Environment and database (Section 1) | `/api/health` returns ok locally and on Vercel | `chore: project setup, env validation and database connection` |
| 2 | Theme and base UI | Five themes switch, phone frame, bottom nav, ComingSoon component, buttons, inputs, sheets | `feat: themes and base ui` |
| 3 | Auth, middleware, onboarding (Section 6) | Sign up, sign in, sign out, onboarding, private routes protected | `feat: authentication, middleware and onboarding` |
| 4 | Posts | Create post with images, feed shows everyone's posts, post page, delete own post | `feat: posts and feed` |
| 5 | Interactions | Like, bookmark, repost, comment, follow, notifications in Activity | `feat: likes, comments, follows and activity` |
| 6 | Profile and search | Own and other profiles, edit profile, search for people and posts | `feat: profiles and search` |
| 7 | Jobs (view only) | Job wall with sample jobs, job detail, apply button, filters | `feat: job wall` |
| 8 | Settings and gaps | Appearance, account, delete account, report flow, admin reports, every unavailable feature shows Coming soon | `feat: settings, moderation and unavailable screens` |
| 9 | Security pass and launch | Section 8 and Section 9 fully ticked | `chore: security hardening and launch` |

Icons: after Phase 0 you add the SVGs from Figma to `src/assets/svgs/` and run `npm run icons`. Do this before Phase 2 so the base UI can use them. If a later phase needs a new icon, Claude lists it and waits.

### 7.3 Phase details

**Phase 2: Theme and base UI**

1. Claude reads the Figma variables with get\_variable\_defs and writes `src/styles/themes.css`: one block per theme (`:root` for light, then `[data-theme="dark"]`, `black`, `blue`, `cream`), with the same variable names as Figma.
2. Map the variables to Tailwind in the theme config.
3. Add a theme provider that stores the choice in a cookie, applied on the server to avoid a flash.
4. Fonts through `next/font` (Poppins for all text, Geom for the GAMORA wordmark only).
5. Build, with build-component, the primitives: button, input, textarea, chip, avatar, badge, skeleton, toast, sheet, dialog, empty-state, coming-soon.
6. Build layout components: phone frame (desktop only), top bar, bottom nav.
7. Build the logo component and the splash and loader animation once you export the facets.

**Phase 4: Posts**

1. Schema: posts, post\_images (url, width, height, position, alt text). Index on created\_at and author.
2. Upload route `/api/upload` with the guards from Section 8, files stored in Vercel Blob under random names.
3. Server actions: createPost, deletePost. Text max 2000 characters, up to 4 images, 5 MB each.
4. Feed: cursor pagination (20 per page), tabs For you and Following, post card from the Figma design.
5. Seed script: a few demo accounts and posts labelled as demo, so the feed is never empty.

**Phase 5: Interactions**

1. Schema: likes, bookmarks, reposts, comments, follows, notifications. Unique constraint on user and post for likes, bookmarks, reposts.
2. Toggle actions are idempotent. Counts come from the database, never from the client.
3. Optimistic UI with rollback on failure.
4. Notifications are created inside the same action. Nothing is created for your own actions.

**Phase 7: Jobs**

1. Jobs are seeded sample data, clearly marked as samples, because hiring is not available yet.
2. Apply opens a sheet where the artist picks portfolio pieces. Saving applications is allowed. Anything on the hirer side shows Coming soon.

**Phase 8: Settings and gaps**

1. Appearance picker with five theme previews.
2. Delete account removes the user, posts, uploaded files and sessions after confirmation.
3. Report sheet on posts, comments and profiles. Reports saved to a table, viewed by admin on `/admin/reports`, with delete and dismiss.
4. Every hirer, shop, wallet, chat and subscription entry point goes to `/unavailable/[feature]`.

Run Claude with this prompt at the start of each phase, filling in the phase: `Start Phase N from the build guide. Read CLAUDE.md and docs/build-log.md first, tell me the plan in a few lines, then build with the build-screen and build-component skills. Do not commit or push until I ask.`

## Section 8: Security checklist

The goal is to handle what a real app faces: bots, scrapers, people guessing passwords, people uploading nasty files, and people poking at URLs. Tick each item in Phase 9, and build the relevant ones in the phase where the feature appears.

| Area | What to do | Where |
| --- | --- | --- |
| Security headers | Content-Security-Policy (default-src 'self', allow your Blob domain for images, no inline scripts beyond what Next needs), Strict-Transport-Security, X-Content-Type-Options nosniff, frame-ancestors 'none' (blocks clickjacking), Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy that turns off camera, mic, geolocation | `next.config.ts` headers |
| Passwords and sessions | Handled by Better Auth (hashed passwords, httpOnly sameSite cookies, secure in production). Minimum length 10. Session expires in 7 days. | `server/auth` |
| Brute force | Rate limit sign-in and sign-up by IP and by email (Better Auth built-in plus Upstash limit). Generic errors that do not reveal whether an email exists. | auth config, `server/security/rate-limit.ts` |
| Authorization (IDOR) | Every edit and delete checks ownership in the query. Never trust an id sent from the client for who the author is. Take the user from the session. | every action |
| Input validation | Zod on every server action and API route: type, length, allowed characters. Reject unknown fields. | `server/validators` |
| Output encoding | React escapes text by default. Never use dangerouslySetInnerHTML. Render links from user text only after checking the protocol is http or https and add rel noopener noreferrer. | components |
| CSRF | Server actions check origin. Better Auth checks trusted origins. Keep cookies sameSite lax or stricter. Any custom API route that changes data checks the Origin header against your app URL. | routes |
| SQL injection | Only Drizzle queries or parameterized SQL. Never build SQL from strings. | `server/services` |
| Upload hardening | Require sign-in. Allow only jpeg, png, webp (no SVG, no gif unless needed). Check real file type from the first bytes, not the file name or the sent type. Max 5 MB, max 4 files. Re-encode with sharp (this strips EXIF and location data, and destroys most hidden payloads). Random file names. Cap dimensions. Limit uploads per user per hour. | `/api/upload`, `server/storage` |
| Rate limiting | Upstash limits per user and per IP: posting, commenting, liking, following, uploading, reporting, searching. Return 429 with a calm message. | `server/security` |
| Secrets | Real values only in `.env.local` and Vercel. Never in git, never in the client bundle, never in logs. Only NEXT\_PUBLIC\_ variables reach the browser, and only the app URL is one. Rotate the Better Auth secret, Google secret and database password if they were ever exposed. | env |
| Dependencies | Run `npm audit` before every checkpoint. Turn on Dependabot alerts and security updates on GitHub. Keep Next.js, Better Auth and sharp updated. Pin with the lock file, install with `npm ci` in CI. | repo |
| Open redirects and SSRF | Only accept internal paths for redirects after sign-in. The server never fetches a URL a user typed. | auth flow, upload |
| Error handling | Never return stack traces, SQL errors or internal messages. Log the detail on the server, send a generic message. | actions |
| Request size and pagination | Cap body size, cap page size at 50 and cap search length at 100 characters. Never return unbounded lists. | services |
| Data exposure | Never send emails, internal ids you do not need, or admin flags to other users. Select explicit columns in queries instead of selecting everything. | services |
| Moderation | Report button on posts, comments and profiles. Admin page to review, delete content and dismiss reports. Block and mute later if time allows. | Phase 8 |
| Account control | Delete account removes the user, content and uploaded files. Rate limit it and ask for confirmation. | settings |
| Logging | Log auth failures, rate limit hits and admin actions with user id and time. Do not log passwords, tokens, or full emails. | server |
| CORS | No wildcard. The app only talks to its own origin. | routes |
| Cookies and consent | If you add analytics, load it only after consent, or skip analytics. | optional |
| Middleware is not the gate | Layers 2, 3 and 4 in Section 6 are mandatory on every route and action. | everywhere |

### 8.1 Header snippet

File: `next.config.ts`

```ts
import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

The policy above allows inline scripts because Next.js needs them unless you set up nonces. A stricter nonce-based policy is a later upgrade. After adding it, open the deployed site, check the browser console for blocked resources, and loosen only what is needed (for example Google sign-in may need `connect-src` or `img-src` entries for Google avatars).

### 8.2 Rate limit helper

File: `src/server/security/rate-limit.ts`

```ts
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env.server";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const limits = {
  post: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:post" }),
  comment: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:comment" }),
  interact: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, "1 h"), prefix: "rl:interact" }),
  upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:upload" }),
  report: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:report" }),
  search: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "10 m"), prefix: "rl:search" }),
} as const;

export async function rateLimit(kind: keyof typeof limits, key: string) {
  const { success } = await limits[kind].limit(key);
  return success;
}
```

Use the user id as the key for signed-in actions, and the IP address (from the request headers) for anything public. When it returns false, the action returns `{ ok: false, error: "rate_limited" }`.

### 8.3 Upload guard outline

File: `src/server/storage/process-image.ts`. Steps, in order:

1. Reject if not signed in or rate limited.
2. Reject if file size is over 5 MB or more than 4 files.
3. Read the first bytes and confirm they match jpeg, png or webp. Reject anything else, whatever the file name says.
4. Open with sharp, reject if width or height is over 6000 px.
5. Resize to a max of 2000 px on the long side, re-encode as webp. This strips metadata.
6. Store in Vercel Blob with a random name (for example `crypto.randomUUID()`), never the original name.
7. Save the URL, width and height to the database inside the same action that creates the post. If the post fails, delete the uploaded files.

### 8.4 Test it like an attacker

Before launch, try these yourself and write the results in `docs/build-log.md`:

- Visit a private page while signed out.
- Change the post id in a delete request to someone else's post.
- Upload a renamed text file as a .jpg, a huge image and an SVG.
- Paste `<script>alert(1)</script>` into a post, comment, bio and username.
- Submit 50 posts quickly.
- Try ten wrong passwords.
- Open `/.env`, `/.env.local` and `/api/health` on the live site (the first two must return 404 and the health route must reveal nothing sensitive).
- Check response headers with the browser network tab or securityheaders.com.
- Run `npm audit`.

## Section 9: Launch checklist

Do these in order after Phase 8, then finish Phase 9.

**Production settings**

1. In Vercel, add every variable from Section 1 for the Production environment. Use a fresh `BETTER_AUTH_SECRET` for production, not the local one.
2. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your live `https://<project>.vercel.app` address.
3. In Google Cloud, add the live callback `https://<project>.vercel.app/api/auth/callback/google` to the authorized redirect URIs.
4. Publish the Google consent screen so people other than your test users can sign in with Google.
5. Run the database migration against the production database: `npm run db:migrate`.
6. Redeploy, then visit `/api/health`.

**Content**

7. Seed the sample jobs and demo posts, clearly labelled as samples or demo.
8. Sign up with your own account first and post your real work, so the feed looks alive on day one.
9. Add simple Terms and Privacy pages (what you store, that posts are public, how to delete an account, how to contact you).
10. Add a short note on the sign-up page: this is a portfolio project, posts are public, do not share anything private.

**Final checks**

11. Section 8 fully ticked, including the attacker test in 8.4.
12. Test on a real phone in two themes, plus a desktop browser.
13. Test sign up with a fresh email and with Google from a private window.
14. Check the Lighthouse scores for accessibility and performance, fix anything red.
15. Confirm `.env.local` was never committed: `git log --all --oneline -- .env.local` must print nothing. If it did, rotate every secret in it.

**After launch**

16. Invite friends. Watch the first posts for anything you want to remove.
17. Set usage alerts in Vercel, Neon and Upstash so a free tier limit does not surprise you. Check Blob storage and bandwidth weekly.
18. Keep Dependabot pull requests merged, and rerun `npm audit` monthly.
19. Add the live link, screenshots and a short write-up (the problem, your design decisions, the stack, the security choices) to your portfolio.
20. Optional: a free subdomain on a domain you already own, for example `gamora.<yourdomain>`, added in Vercel with the DNS record it shows. Update the two URL variables and the Google redirect URI to match.

**What stays Coming soon**

Hirer accounts, posting jobs, applicants and hiring, shop, wallet and escrow, chat, subscriptions and creator stats. Each shows the Coming soon screen from `/unavailable/[feature]` and is listed in your write-up as the next stage.