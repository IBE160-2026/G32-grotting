import { applyMigrations, closeDb, getDb } from "@/shared/server/db";

// The only way migrations are applied (AD-9). Run with `npm run db:migrate`.
try {
  await applyMigrations(await getDb());
} finally {
  await closeDb();
}
