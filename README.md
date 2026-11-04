# Gamora

Gamora is a mobile social platform for artists. Artists sign up, post their work, follow each other, and browse a job wall. It is a portfolio project: the artist side is real and live, and everything on the hiring and money side is marked "Coming soon".

Live site: <gamora-xi.vercel.app>

## What you can do

- **Sign up and sign in** with email and password, or with Google. The welcome screen starts with your email: an existing account asks for a password, a new one creates an account.
- **Onboarding:** pick a role, a username (checked live), a display name, an avatar and your interests.
- **Post your work:** text plus up to 4 images. Images are checked, resized and re-encoded on the server before they are stored.
- **Feed:** For you and Following tabs, a genre filter, pull to refresh, a new-posts pill, and a full-screen image viewer with zoom.
- **Interact:** like, bookmark, repost, comment, follow and share. Counts come from the database.
- **Activity:** notifications with an unread badge on the bell.
- **Profiles and search:** your own and other artists' profiles with Activity, Replies, Likes and Reposts lists; search for people and posts with suggestions.
- **Job wall:** browse sample jobs, open a job and apply with pieces from your portfolio.
- **Settings:** five themes (Light, Dark, Black, Blue, Cream), Terms and Privacy, block users, report content, delete your account.
- **Moderation:** reports go to an admin page where content can be deleted or dismissed.
- **Link previews:** shared links show a title, text and picture.

## What is not available

These features are designed but not built. Their entry points open a "Coming soon" screen:

- Hirer accounts and the hirer subscription
- Posting jobs, viewing applicants and hiring
- Shop and buying art
- Wallet, escrow and withdrawals
- Chat
- Artist subscriptions and creator stats
- Sign in with Apple

The jobs on the wall are sample data and are labelled as samples. Seeded posts are labelled as demo.

## Tech

| Area | Tool |
|---|---|
| Framework | Next.js (App Router) with TypeScript |
| Styling | Tailwind CSS with CSS variables for the five themes, shadcn/ui and Radix, vaul for bottom sheets, Motion for animation |
| Auth | Better Auth (email and password, Google) |
| Database | Neon Postgres with Drizzle ORM |
| Image storage | Vercel Blob, processed with sharp |
| Rate limiting | Upstash Redis |
| Validation | Zod |
| Hosting | Vercel |
| Design | Figma, read through the Figma MCP |
| Built with | Claude Code |

## How it is organised

```
src/
  app/            routes (public, auth, app, admin) and API routes
  components/     ui, layout, shared, feed, jobs, profile, onboarding, icons
  server/         db schema, auth, services (data), actions (mutations), validators, security, storage
  lib/            env validation and helpers
  styles/         themes.css
docs/             build guide and build log
drizzle/          migrations
```

Server code never imports from components. Every mutation follows the same order: validate with Zod, check the signed-in user, check ownership, rate limit, then write.

## Run it locally

You need Node 20 or newer and accounts for Neon, Upstash, Vercel Blob and Google Cloud (for Google sign-in).

```bash
git clone https://github.com/abuelosolos/gamora.git
cd gamora
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string, used for migrations |
| `BETTER_AUTH_SECRET` | Random secret: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client (redirect URI `http://localhost:3000/api/auth/callback/google`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token (public store) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |
| `ADMIN_EMAILS` | Comma-separated emails allowed to use the admin page |

Then set up the database and start the app:

```bash
npm run db:migrate
npm run db:seed      # optional: sample jobs and demo posts
npm run dev
```

Open http://localhost:3000.

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npm run db:generate` | Create a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run icons` | Generate icon components from `src/assets/svgs` |

## Security

- Security headers (content security policy, HSTS, frame protection, referrer and permissions policies)
- Rate limiting on sign-in, sign-up and every write action
- Zod validation on all inputs and ownership checks on every edit and delete
- Uploads are type-checked by content, size-limited, resized and re-encoded (metadata removed) under random names
- Real secrets only live in `.env.local` and Vercel, never in the repository
- Middleware is a convenience only. The layout, every server action and every ownership check verify the session again

Known trade-off: the email-first sign-in reveals whether an email has an account, because there is no email verification. It is rate limited.

## Status

Artist side complete. Hirer side, shop, wallet and chat are planned.
