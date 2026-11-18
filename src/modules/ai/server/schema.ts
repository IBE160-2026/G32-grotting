import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// One row per scope and Oslo day: how many AI requests were reserved (FR-25).
// `scope` is a Student id or 'installation'; no foreign key, so it works before
// accounts exist (Epic 6).
export const aiUsage = pgTable(
  "ai_usage",
  {
    scope: text("scope").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.scope, table.day] })],
);
