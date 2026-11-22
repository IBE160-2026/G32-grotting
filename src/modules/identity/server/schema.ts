import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// `identity` owns these two tables (AD-10). The email is stored lower-cased in
// plain text; the password only as `scrypt$N$r$p$salt$hash` (AD-11). The name
// is not here: it lives only in `profiles.name`.
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The read-only reference other slices' tables use for `student_id` (AD-9).
export const studentIdRef = () => students.id;

// Only the SHA-256 of the token is stored (AD-12). `last_active_at` is the last
// extension: a session ends 30 minutes after it.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(studentIdRef, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_student_id_idx").on(table.studentId)],
);
