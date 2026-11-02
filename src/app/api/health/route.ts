import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  // With Cache Components a GET handler is prerendered at build time unless it
  // reads request-time data. connection() makes this run per request.
  await connection();
  await db.execute(sql`select 1`);
  return Response.json({ ok: true });
}
