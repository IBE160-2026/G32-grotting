import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

// What a repository function runs its queries on: the database, or the `tx` of
// a transaction (AD-10). Both drivers' databases and transactions fit.
export type Executor = PgDatabase<PgQueryResultHKT>;

// A Postgres unique violation, looked up on the error and on its cause (Drizzle
// wraps the driver's error).
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current !== null; depth++) {
    if (typeof current !== "object") return false;
    const record = current as { code?: unknown; cause?: unknown };
    if (record.code === "23505") return true;
    current = record.cause ?? null;
  }
  return false;
}
