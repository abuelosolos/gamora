/**
 * CLI-only config used to generate the Better Auth tables:
 *
 *   npx auth@latest generate --config scripts/auth-schema.config.ts \
 *     --output src/server/db/schema/auth.ts --adapter drizzle --dialect postgresql -y
 *
 * The real config (src/server/auth/index.ts) cannot be loaded by the CLI: it
 * imports "server-only" and the database client, and it needs real env values.
 * This file has no database and no env. Only options that change the schema
 * matter here, so keep its plugin list and additionalFields in step with the
 * real config. Never put real credentials in this file.
 */
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: { clientId: "schema-only", clientSecret: "schema-only" },
  },
});
