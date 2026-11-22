import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { encryptedText } from "@/shared/server/crypto";
// AD-9: another slice's schema file reaches `students(id)` only through the
// read-only `studentIdRef`.
import { studentIdRef } from "../../identity/server/schema";

// One row per Student (AD-10); `student_id` is the key, so a lookup by
// `(id, studentId)` is the key itself. The name is the only copy and is stored
// encrypted (AD-11). `ai_notice_version` is plain text and null until the
// Student has accepted a notice. The CV text is added by Story 6.3.
export const profiles = pgTable("profiles", {
  studentId: uuid("student_id")
    .primaryKey()
    .references(studentIdRef, { onDelete: "cascade" }),
  name: encryptedText("name").notNull(),
  aiNoticeVersion: text("ai_notice_version"),
});
