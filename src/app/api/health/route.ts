import { sql } from "drizzle-orm";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build, so it reads the real run mode.
export const dynamic = "force-dynamic";

export const GET = handle("/api/health", async () => {
  const db = await getDb();
  await db.execute(sql`select 1`);
  return { hosted: getConfig().hosted };
});
