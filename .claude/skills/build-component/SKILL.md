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
