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
- Use the defined text styles: Fraunces for display and titles, Inter for everything else.
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
