import "dotenv/config";

import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// drizzle-kit does not read Next's `.env.local` on its own, so load it
// explicitly. Real values stay in the gitignored `.env.local`.
config({ path: ".env.local" });

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
