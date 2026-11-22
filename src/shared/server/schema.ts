import { sql } from "drizzle-orm";
import { check, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

// One row, ever: the SHA-256 of the key this database was first started with
// (AD-11). Setup compares it on every start, so a database is never paired with
// another key unnoticed. It holds no personal data and no key.
export const localMeta = pgTable(
  "local_meta",
  {
    id: smallint("id").primaryKey().default(1),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("local_meta_single_row", sql`${table.id} = 1`)],
);
