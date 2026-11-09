import { z } from "zod";

const fallbackAppUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const clientEnv = z
  .object({ NEXT_PUBLIC_APP_URL: z.string().url() })
  .parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl });
