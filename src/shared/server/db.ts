import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import { getConfig } from "./config";

type PostgresDb = PostgresJsDatabase & { $client: Sql };
type PgliteDb = PgliteDatabase & { $client: PGlite };

export type Db = PostgresDb | PgliteDb;

const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");

// One instance per process, kept on globalThis so a second copy of this module
// (dev reloads, separate route bundles) reuses it (AD-9).
const holder = globalThis as typeof globalThis & {
  __jobassistantDb?: Promise<Db>;
};

async function openDb(): Promise<Db> {
  const { db } = getConfig();
  if (db.kind === "pglite") {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const opened = drizzle({ client: await PGlite.create() });
    await applyMigrations(opened);
    return opened;
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  return drizzle({ client: postgres(db.url, { max: 1, idle_timeout: 20 }) });
}

export function getDb(): Promise<Db> {
  holder.__jobassistantDb ??= openDb();
  return holder.__jobassistantDb;
}

// Applies the committed migration history. A no-op until a story generates one.
export async function applyMigrations(db: Db): Promise<void> {
  if (!existsSync(join(MIGRATIONS_FOLDER, "meta", "_journal.json"))) return;
  const migrationsFolder = MIGRATIONS_FOLDER;
  if (getConfig().db.kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as PgliteDatabase, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as PostgresJsDatabase, { migrationsFolder });
  }
}

// Runs `fn` while holding a Postgres advisory lock, so two starting containers
// never migrate at once (AD-17). The pool has one connection (AD-9), so the
// lock and its release run on the same session. PGlite has one process: no lock.
export async function withAdvisoryLock<T>(
  db: Db,
  key: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (getConfig().db.kind === "pglite") return fn();
  await db.execute(sql`select pg_advisory_lock(${key})`);
  try {
    return await fn();
  } finally {
    // A dropped connection already released the lock; do not hide fn's error.
    await db.execute(sql`select pg_advisory_unlock(${key})`).catch(() => {});
  }
}

export async function closeDb(): Promise<void> {
  const pending = holder.__jobassistantDb;
  holder.__jobassistantDb = undefined;
  if (pending === undefined) return;
  const db = await pending.catch(() => undefined);
  if (db === undefined) return;
  if (getConfig().db.kind === "pglite") {
    await (db as PgliteDb).$client.close();
  } else {
    await (db as PostgresDb).$client.end();
  }
}
