import { seedTestUser } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { getDb, registerE2eSeed } from "@/shared/server/db";

// Node-only part of the start-up hook (Story 6.11). Under E2E=1 it gives
// `db.ts` the test-user seed and opens the in-memory database now, so that the
// seed has run when the web server starts answering and the end-to-end tests
// can log in. Anywhere else it does nothing.
export async function startE2eSeed(): Promise<void> {
  const config = getConfig();
  if (!config.e2e) return;
  registerE2eSeed((db, seedConfig) => seedTestUser(db, seedConfig));
  if (
    config.db.kind === "pglite" &&
    config.features.accounts &&
    !config.hosted
  ) {
    await getDb();
  }
}
