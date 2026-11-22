import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
  assertEncryptionKey,
  type Config,
  getConfig,
  isTestRunEnv,
  parseConfig,
  readEnv,
  secretsFilePath,
} from "@/shared/server/config";
import { hashKey } from "@/shared/server/crypto";
import {
  applyMigrations,
  closeDb,
  type Db,
  getDb,
  withAdvisoryLock,
} from "@/shared/server/db";
import { localMeta } from "@/shared/server/schema";

// Run by the `app` container before `next start`, and by `npm run dev` (AD-17).

// Arbitrary constant: every starting container asks for the same lock.
const SETUP_LOCK_KEY = 7_041_160;

const LOCAL_HOSTS = ["db", "127.0.0.1", "localhost"];

type SetupConfig = Pick<Config, "hosted" | "db" | "encryptionKey">;

export type LocalStep = (db: Db, config: SetupConfig) => Promise<void>;

// The database belongs to the key it was first started with (AD-11). The first
// start stores sha256 of the key; a later start with another key stops here, so
// nothing is ever encrypted under one key and read with another. Neither the
// key nor its hash is printed.
export const checkKeyStep: LocalStep = async (db, config) => {
  if (config.encryptionKey === undefined) return;
  const keyHash = hashKey(config.encryptionKey);
  await db.insert(localMeta).values({ id: 1, keyHash }).onConflictDoNothing();
  const [row] = await db
    .select({ keyHash: localMeta.keyHash })
    .from(localMeta)
    .where(eq(localMeta.id, 1));
  if (row?.keyHash !== keyHash) {
    throw new Error(
      "ENCRYPTION_KEY: the key doesn't match this database: run `docker compose down -v` and delete `.data/`",
    );
  }
};

// Steps that write to a local database only. Story 6.11 (seed) adds its own.
export const LOCAL_STEPS: readonly LocalStep[] = [checkKeyStep];

// The production guard: local-only steps never run against another database.
export function isLocalTarget(config: Pick<Config, "hosted" | "db">): boolean {
  if (config.hosted || config.db.kind !== "postgres") return false;
  try {
    return LOCAL_HOSTS.includes(new URL(config.db.url).hostname);
  } catch {
    return false;
  }
}

const hasValue = (value: string | undefined): value is string =>
  value !== undefined && value !== "";

// Writes the local key when neither the environment nor the secrets file has
// one. The file is created with flag `wx`, so setup never overwrites it; when
// it already exists (another start won the race, or it holds other settings) it
// is read again and only a missing key is appended. Returns whether it wrote.
export function ensureSecret(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (hasValue(readEnv(env).ENCRYPTION_KEY)) return false;
  const path = secretsFilePath(env);
  const line = `ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\n`;
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, line, { flag: "wx", mode: 0o600 });
    return true;
  } catch (error) {
    if ((error as { code?: unknown }).code !== "EEXIST") throw error;
  }
  if (hasValue(readEnv(env).ENCRYPTION_KEY)) return false;
  const existing = readFileSync(path, "utf8");
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  appendFileSync(path, `${separator}${line}`);
  return true;
}

// The secrets step, before the full config is read: the key may not exist yet,
// so the first look tolerates its absence. Secrets are written only on a local
// target (the production guard).
export function prepareSecrets(
  env: Record<string, string | undefined> = process.env,
): boolean {
  // A test run never reads the file (config ignores it), so a key written here
  // would never be seen and every run would add another line.
  if (isTestRunEnv(env)) return false;
  const merged = readEnv(env);
  if (!isLocalTarget(parseConfig(merged))) return false;
  return ensureSecret(env);
}

export async function runSetup(
  db: Db,
  config: SetupConfig,
  localSteps: readonly LocalStep[] = LOCAL_STEPS,
): Promise<void> {
  await withAdvisoryLock(db, SETUP_LOCK_KEY, async () => {
    await applyMigrations(db);
    if (!isLocalTarget(config)) return;
    for (const step of localSteps) await step(db, config);
  });
}

async function main(): Promise<void> {
  try {
    prepareSecrets();
    const config = getConfig();
    // After the secrets step: a foreign database gets no generated key.
    assertEncryptionKey(config);
    await runSetup(await getDb(), config);
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
