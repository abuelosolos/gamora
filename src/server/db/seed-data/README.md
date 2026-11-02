# Seed images

Images for `npm run db:seed`. JPEG, PNG or WebP, up to 6000 px on each side.
The extension can be .webp, .png, .jpg or .jpeg.

| File | Used for |
| --- | --- |
| `avatar-mira_demo`, `avatar-tobi_demo`, `avatar-sana_demo`, `avatar-kai_demo` | profile pictures (`juno_demo` has none on purpose, to show the initials fallback) |
| `art-01` | Mira's post, and Tobi's two-image post |
| `art-02` | Juno's post |
| `art-03` | Tobi's posts |
| `art-04` | Sana's post |

A missing file is skipped with a warning; the post or profile is still created
without it. The seed script uploads the files to Vercel Blob (resized and
re-encoded as WebP), so these files are never served from the repo.
