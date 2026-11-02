/**
 * Art categories offered during onboarding. Names come from the Figma
 * "What type of art would you like to see" screen (duplicate "Sculptures"
 * removed). The first VISIBLE_INTERESTS show by default, the rest sit behind
 * "See more". The server accepts only values from this list.
 */
export const INTERESTS = [
  "NFT art",
  "Indie art",
  "Animations",
  "Sculptures",
  "3D models",
  "Low-Poly Art",
  "Cartoon art",
  "Vaporwave",
  "Animation sequences",
  "Art Deco",
  "Digital painting",
  "Illustration",
  "Pixel art",
  "Concept art",
  "Photography",
  "Typography",
  "Character design",
  "Abstract",
] as const

export type Interest = (typeof INTERESTS)[number]

export const VISIBLE_INTERESTS = 10
export const MAX_INTERESTS = 12
