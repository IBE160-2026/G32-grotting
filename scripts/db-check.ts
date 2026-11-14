import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { closeDb, getDb } from "@/shared/server/db";

// `npm run db:check` (AD-9): the committed migration history is consistent and
// applies from zero. CI runs it in the test container, which has no database,
// so it uses PGlite in memory whatever the environment says.
process.env.DATABASE_URL = "pglite://memory";

const JOURNAL = "drizzle/meta/_journal.json";

if (!existsSync(JOURNAL)) {
  // Without a history `drizzle-kit check` would write an empty journal into the
  // working tree, and there is nothing to apply, so both steps wait for the
  // first story that generates a migration.
  process.stdout.write("No migration history yet: nothing to check.\n");
} else {
  const check = spawnSync(
    process.execPath,
    ["node_modules/drizzle-kit/bin.cjs", "check"],
    { stdio: "inherit" },
  );
  if (check.error) process.stderr.write(`${String(check.error)}\n`);
  if (check.status !== 0) process.exit(1);
  try {
    // Opening PGlite applies the whole history to an empty database.
    await getDb();
    process.stdout.write("Migrations apply from zero on PGlite.\n");
  } catch (error) {
    process.stderr.write(`db:check failed: ${String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
