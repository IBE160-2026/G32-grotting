import "server-only";
import { z } from "zod";
import { createProfile } from "@/modules/profile";
import type { Db } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { type RegisterResponse, registerRequestSchema } from "../contracts";
import { isAccessCodeCorrect } from "./access";
import { hashPassword } from "./passwords";
import { createStudent, EmailTakenError, findStudentByEmail } from "./students";

export type RegisterOptions = {
  readonly hosted: boolean;
  readonly accessCode: string | undefined;
};

const accessCodeOnly = z.object({ accessCode: z.string().optional() });

// On Hosted the Access code is required and checked before anything else, so
// nothing about the other fields or the email is learned without it (FR-31). A
// wrong or missing code is INVALID_INPUT on `accessCode`.
export function assertRegistrationAccessCode(
  body: unknown,
  options: RegisterOptions,
): void {
  if (!options.hosted) return;
  const submitted = accessCodeOnly.safeParse(body);
  const code = submitted.success ? submitted.data.accessCode : undefined;
  if (
    options.accessCode === undefined ||
    code === undefined ||
    !isAccessCodeCorrect(code, options.accessCode)
  ) {
    throw new ApiError("INVALID_INPUT", { field: "accessCode" });
  }
}

// Registers a Student: the Student and the Profile in one transaction, the
// email lower-cased, the password as a scrypt hash, the name encrypted. Does not
// log in. Nothing here logs or echoes the password or the body.
export async function registerAccount(
  db: Db,
  body: unknown,
  options: RegisterOptions,
): Promise<RegisterResponse> {
  assertRegistrationAccessCode(body, options);
  const { name, email, password } = registerRequestSchema.parse(body);

  const emailTaken = () => new ApiError("INVALID_INPUT", { field: "email" });
  if ((await findStudentByEmail(db, email)) !== null) throw emailTaken();

  const passwordHash = await hashPassword(password);
  try {
    return await db.transaction(async (tx) => {
      const { studentId } = await createStudent(tx, { email, passwordHash });
      await createProfile(tx, studentId, name);
      return { studentId };
    });
  } catch (error) {
    // Lost a race for the same email after the check above.
    if (error instanceof EmailTakenError) throw emailTaken();
    throw error;
  }
}
