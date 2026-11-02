# Gamora build log

Started 2026-11-02.

- 2026-11-02: Components and layout. ui: button, input, textarea, chip, avatar, badge, skeleton, toast, sheet, dialog; shared: empty-state, coming-soon; layout: phone-frame, top-bar, bottom-nav; temporary review page at /dev/components (delete src/app/dev when approved). Missing icons: shop, warning, coming-soon illustration, logo.
- 2026-11-02: Auth. Better Auth server config, client and /api/auth/[...all]; auth tables generated with `npx auth@latest generate` (CLI is now `auth`, not `@better-auth/cli`); profile table added; migration drizzle/0000 generated, NOT yet migrated.
- 2026-11-02: Access control. src/proxy.ts (cookie check, public reading of feed/post/profiles), session helpers (requireUser, requireAdmin, action variants), (app)/(private) and (admin) layout guards, safeNextPath open-redirect check. Placeholder pages: feed, post/[id], u/[username], create.
- 2026-11-02: Auth screens: welcome, sign-in, sign-up, onboarding wizard (role, name, username, avatar, interests), rate-limited server actions, profile guard on (private). Typecheck, lint and build pass; real sign-up/DB flow untested until migrate.
