import "server-only";
import { eq } from "drizzle-orm";
import { type Executor, isUniqueViolation } from "./executor";
import { students } from "./schema";

export class EmailTakenError extends Error {
  constructor() {
    super("EMAIL_TAKEN");
    this.name = "EmailTakenError";
  }
}

// Creates the Student; the caller runs this and `profile.createProfile` in one
// transaction (AD-10). The email must already be lower-cased and the password
// already hashed. A taken email, also one lost in a race, is `EmailTakenError`.
export async function createStudent(
  tx: Executor,
  input: { readonly email: string; readonly passwordHash: string },
): Promise<{ studentId: string }> {
  try {
    const [row] = await tx
      .insert(students)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .returning({ id: students.id });
    if (row === undefined) throw new Error("Student was not created");
    return { studentId: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) throw new EmailTakenError();
    throw error;
  }
}

// Login: the one lookup by email, which is not by Student id.
export async function findStudentByEmail(
  db: Executor,
  email: string,
): Promise<{ studentId: string; passwordHash: string } | null> {
  const [row] = await db
    .select({ id: students.id, passwordHash: students.passwordHash })
    .from(students)
    .where(eq(students.email, email))
    .limit(1);
  return row === undefined
    ? null
    : { studentId: row.id, passwordHash: row.passwordHash };
}

// The Student's own row, looked up by the id from the session.
export async function getStudentEmail(
  studentId: string,
  db: Executor,
): Promise<string | null> {
  const [row] = await db
    .select({ email: students.email })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  return row?.email ?? null;
}

// The seed's insert (Story 6.11): `INSERT … ON CONFLICT DO NOTHING` on the email.
// Returns the new id, or null when the email already had a row. The email must
// already be lower-cased and the password already hashed.
export async function insertStudentIfAbsent(
  tx: Executor,
  input: { readonly email: string; readonly passwordHash: string },
): Promise<string | null> {
  const [row] = await tx
    .insert(students)
    .values({ email: input.email, passwordHash: input.passwordHash })
    .onConflictDoNothing({ target: students.email })
    .returning({ id: students.id });
  return row?.id ?? null;
}
