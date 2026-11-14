import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Config, getConfig } from "@/shared/server/config";
import {
  applyMigrations,
  closeDb,
  type Db,
  getDb,
  withAdvisoryLock,
} from "@/shared/server/db";

// Run by the `app` container before `next start`, and by `npm run dev` (AD-17).

// Arbitrary constant: every starting container asks for the same lock.
const SETUP_LOCK_KEY = 7_041_160;

const LOCAL_HOSTS = ["db", "127.0.0.1", "localhost"];

export type LocalStep = (db: Db) => Promise<void>;

// Steps that write to a local database only. Stories 6.1 (secrets) and 6.11
// (seed) add theirs here.
export const LOCAL_STEPS: readonly LocalStep[] = [];

// The production guard: local-only steps never run against another database.
export function isLocalTarget(config: Pick<Config, "hosted" | "db">): boolean {
  if (config.hosted || config.db.kind !== "postgres") return false;
  try {
    return LOCAL_HOSTS.includes(new URL(config.db.url).hostname);
  } catch {
    return false;
  }
}

export async function runSetup(
  db: Db,
  config: Pick<Config, "hosted" | "db">,
  localSteps: readonly LocalStep[] = LOCAL_STEPS,
): Promise<void> {
  await withAdvisoryLock(db, SETUP_LOCK_KEY, async () => {
    await applyMigrations(db);
    if (!isLocalTarget(config)) return;
    for (const step of localSteps) await step(db);
  });
}

async function main(): Promise<void> {
  try {
    await runSetup(await getDb(), getConfig());
  } finally {
    await closeDb();
  }
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main().catch((error: unknown) => {
    // Drizzle wraps the driver error; report the root cause.
    let failure = error instanceof Error ? error : new Error(String(error));
    while (failure.cause instanceof Error) failure = failure.cause;
    const code = "code" in failure ? ` ${String(failure.code)}` : "";
    const message = failure.message === "" ? "" : `: ${failure.message}`;
    process.stderr.write(`Setup failed: ${failure.name}${code}${message}
`);
    process.exit(1);
  });
}
