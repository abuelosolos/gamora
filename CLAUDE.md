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
File: https://www.figma.com/design/m7Bqypb37d5YlsqgdH15N3/Gamora?t=KVmcQggBYq4twwNs-0. Read screens with the Figma MCP. Use the build-screen skill for screens and the build-component skill for components.

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
