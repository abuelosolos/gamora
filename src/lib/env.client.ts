import { z } from "zod";

export const clientEnv = z
  .object({ NEXT_PUBLIC_APP_URL: z.string().url() })
  .parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL });
