import "server-only";
import dns from "node:dns";
import net from "node:net";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env.server";

// Prevent Node's 250ms Happy Eyeballs timeout from aborting 300ms+ IPv4 handshakes
// when IPv6 is unreachable (ENETUNREACH) during parallel Neon HTTP bursts.
dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === "function") {
  net.setDefaultAutoSelectFamilyAttemptTimeout(5000);
}

export const db = drizzle(neon(env.DATABASE_URL), { schema });
