import "server-only";
import { upsertSeedProfile } from "@/modules/profile";
import { type Config, isLocalPostgres } from "@/shared/server/config";
import { loadExamplePair } from "@/shared/server/data-files";
import type { Db } from "@/shared/server/db";
import { hashPassword, verifyPassword } from "./passwords";
import { findStudentByEmail, insertStudentIfAbsent } from "./students";

// The local test user (FR-29, Story 6.11). Made-up values for a local run only;
// the README names the email and the password, and `scripts/smoke.mjs` logs in
// with them (a test checks that the three agree). Never a real person, never
// used on Hosted. The password is stored only as a hash.
export const SEED_TEST_USER = {
  name: "Violet Hansen",
  email: "testbruker@jobassistant.local",
  password: "testpassord-2026",
} as const;

export type SeedConfig = Pick<
  Config,
  "hosted" | "db" | "encryptionKey" | "features" | "isTestRun"
>;

// The three conditions of AD-12, and the key: accounts on, a local run (never
// Hosted), and a database that is local. The database is the local Postgres, or
// the in-memory PGlite of a test run (Playwright with `E2E=1`, and Vitest). The
// CV is stored encrypted, so without the key there is nothing to seed.
export function mayRunSeed(config: SeedConfig): boolean {
  if (!config.features.accounts || config.hosted) return false;
  if (config.encryptionKey === undefined) return false;
  if (config.db.kind === "pglite") return config.isTestRun;
  return isLocalPostgres(config);
}

// Creates the test user and its Profile when they do not exist, and replaces its
// Profile CV with the Example pair's on every run. Returns whether it ran. The
// user is inserted with `ON CONFLICT DO NOTHING`; an account that holds the seed
// email but not the seed password is somebody else's and is left untouched.
export async function seedTestUser(
  db: Db,
  config: SeedConfig,
): Promise<boolean> {
  if (!mayRunSeed(config)) return false;
  // Line endings as the CV field gives them: LF, whatever the checkout used.
  const cvText = (await loadExamplePair()).cvText.replaceAll("\r\n", "\n");
  return db.transaction(async (tx) => {
    let studentId: string | null = null;
    const existing = await findStudentByEmail(tx, SEED_TEST_USER.email);
    if (existing === null) {
      const passwordHash = await hashPassword(SEED_TEST_USER.password);
      studentId = await insertStudentIfAbsent(tx, {
        email: SEED_TEST_USER.email,
        passwordHash,
      });
    }
    if (studentId === null) {
      // Already there: the one created by an earlier run, or one that won a race
      // for the email just now. Only the seed's own account is touched.
      const found =
        existing ?? (await findStudentByEmail(tx, SEED_TEST_USER.email));
      if (
        found === null ||
        !(await verifyPassword(SEED_TEST_USER.password, found.passwordHash))
      ) {
        return false;
      }
      studentId = found.studentId;
    }
    await upsertSeedProfile(tx, {
      studentId,
      name: SEED_TEST_USER.name,
      cvText,
      savedAt: new Date(),
    });
    return true;
  });
}
