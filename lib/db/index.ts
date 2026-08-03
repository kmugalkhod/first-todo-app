import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as neonServerlessDrizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Shared server-side database handles.
 *
 * `db` uses the Neon HTTP driver (ideal for Server Components, Server Actions
 * and route handlers).
 *
 * `dbWrite` uses the Neon serverless WebSocket Pool, which is required for
 * ACID transactions — e.g. "create project + owner membership" must be atomic
 * (reliability NFR). Prefer `db` for single-record reads/writes and
 * `data-access/transaction.ts` (which wraps `dbWrite.transaction`) for any
 * multi-record write that must commit or roll back together.
 */
const connectionString = process.env.DATABASE_URL ?? "";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

const pool = new Pool({ connectionString });

export const dbWrite = neonServerlessDrizzle(pool, { schema });

export * from "./schema";
