import "server-only";
import { ApiError } from "@/shared/server/handle";
import { loginRequestSchema, type SessionView } from "../contracts";
import type { Executor } from "./executor";
import { verifyPassword } from "./passwords";
import { buildSessionView } from "./session-view";
import { createSession, deleteSessionByToken } from "./sessions";
import { findStudentByEmail } from "./students";

// Logs a Student in: a new session and its view. A wrong password and an
// unknown email give the same field error, and the same work (an unknown email
// is verified against a dummy hash). `token` is for the cookie and goes nowhere
// else.
export async function loginAccount(
  db: Executor,
  body: unknown,
  now: Date,
): Promise<{ token: string; view: SessionView }> {
  const { email, password } = loginRequestSchema.parse(body);
  const student = await findStudentByEmail(db, email);
  const correct = await verifyPassword(password, student?.passwordHash);
  if (student === null || !correct) {
    throw new ApiError("INVALID_INPUT", { field: "password" });
  }
  const { token, expiresAt } = await createSession(student.studentId, now, db);
  try {
    return {
      token,
      view: await buildSessionView(student.studentId, expiresAt, db),
    };
  } catch (error) {
    // No cookie goes out, so the row would be a session nobody holds.
    await deleteSessionByToken(db, token);
    throw error;
  }
}
