import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { env } from "@/lib/env.server";
import { clientEnv } from "@/lib/env.client";

// If you add a plugin or additionalFields here, mirror it in
// scripts/auth-schema.config.ts so the generated schema stays correct.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [clientEnv.NEXT_PUBLIC_APP_URL],
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
