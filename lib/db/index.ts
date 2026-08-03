import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Shared server-side database handle. Uses the serverless Neon HTTP driver so
 * it runs cleanly inside Server Components, Server Actions and route handlers.
 */
const sql = neon(process.env.DATABASE_URL ?? "");

export const db = drizzle(sql, { schema });

export * from "./schema";
