import { sql } from "drizzle-orm";
import type { Db } from "@/shared/server/db";
import { aiUsage } from "./schema";

// AI requests per scope and Oslo day (FR-25, NFR-8).
export const DAILY_CAP = 30;

/**
 * Reserves one request for `(scope, day)`. The upsert makes sure the row
 * exists; the guarded UPDATE is one atomic statement, so concurrent requests
 * cannot pass the limit. Returns false when the cap is reached. A reserved
 * request is never given back.
 */
export async function reserveRequest(
  db: Db,
  scope: string,
  day: string,
): Promise<boolean> {
  await db.execute(
    sql`insert into ${aiUsage} (scope, day, count) values (${scope}, ${day}, 0) on conflict (scope, day) do nothing`,
  );
  const rows = await db.execute(
    sql`update ${aiUsage} set count = count + 1 where scope = ${scope} and day = ${day} and count < ${DAILY_CAP} returning count`,
  );
  return rowCount(rows) > 0;
}

// The two drivers answer differently: PGlite gives `{ rows }`, postgres-js an
// array-like result.
function rowCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  const rows = (result as { rows?: unknown[] }).rows;
  return rows?.length ?? 0;
}
