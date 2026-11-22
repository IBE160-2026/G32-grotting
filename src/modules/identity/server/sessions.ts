import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import type { Executor } from "./executor";
import { sessions } from "./schema";

// A session ends 30 minutes after its last extension; a request extends it only
// when the last extension is 5 minutes old (AD-12).
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const SESSION_EXTEND_AFTER_MS = 5 * 60 * 1000;

const TOKEN_BYTES = 32;
// A real token is 43 characters of base64url; anything longer is not looked up.
const TOKEN_MAX_LENGTH = 200;

export type FoundSession = {
  readonly sessionId: string;
  readonly studentId: string;
  readonly expiresAt: Date;
};

// Only this hash is stored, so a copy of the database cannot be used as a
// cookie.
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function expiry(lastActiveAt: Date): Date {
  return new Date(lastActiveAt.getTime() + SESSION_TTL_MS);
}

// Returns the raw token once; it is never stored. Also deletes this Student's
// expired rows, so they do not pile up.
export async function createSession(
  studentId: string,
  now: Date,
  db: Executor,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.studentId, studentId),
        lte(sessions.lastActiveAt, new Date(now.getTime() - SESSION_TTL_MS)),
      ),
    );
  await db
    .insert(sessions)
    .values({ studentId, tokenHash: hashToken(token), lastActiveAt: now });
  return { token, expiresAt: expiry(now) };
}

// The session a cookie stands for, or null. Expired (30 minutes idle) deletes
// the row. Extends (`last_active_at = now`) only when the last extension is 5
// minutes old, in one conditional UPDATE.
export async function lookupSession(
  db: Executor,
  token: string,
  now: Date,
): Promise<FoundSession | null> {
  if (token.length === 0 || token.length > TOKEN_MAX_LENGTH) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      id: sessions.id,
      studentId: sessions.studentId,
      lastActiveAt: sessions.lastActiveAt,
    })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (row === undefined) return null;

  const idle = now.getTime() - row.lastActiveAt.getTime();
  if (idle >= SESSION_TTL_MS) {
    // Only the row as it was read: a renewal that landed in between stands.
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.id, row.id),
          eq(sessions.lastActiveAt, row.lastActiveAt),
        ),
      );
    return null;
  }
  let lastActiveAt = row.lastActiveAt;
  if (idle >= SESSION_EXTEND_AFTER_MS) {
    const extended = await db
      .update(sessions)
      .set({ lastActiveAt: now })
      .where(
        and(
          eq(sessions.id, row.id),
          lte(
            sessions.lastActiveAt,
            new Date(now.getTime() - SESSION_EXTEND_AFTER_MS),
          ),
        ),
      )
      .returning({ lastActiveAt: sessions.lastActiveAt });
    if (extended[0] !== undefined) {
      lastActiveAt = now;
    } else {
      // Another request got there first: its time stands, or the row is gone
      // (logout) and so is the session.
      const [current] = await db
        .select({ lastActiveAt: sessions.lastActiveAt })
        .from(sessions)
        .where(eq(sessions.id, row.id))
        .limit(1);
      if (current === undefined) return null;
      lastActiveAt = current.lastActiveAt;
    }
  }
  return {
    sessionId: row.id,
    studentId: row.studentId,
    expiresAt: expiry(lastActiveAt),
  };
}

// Always extends (`POST /api/session/renew`). Null when the row is not this
// Student's or is gone.
export async function renewSession(
  studentId: string,
  sessionId: string,
  now: Date,
  db: Executor,
): Promise<Date | null> {
  const [row] = await db
    .update(sessions)
    .set({ lastActiveAt: now })
    .where(and(eq(sessions.id, sessionId), eq(sessions.studentId, studentId)))
    .returning({ lastActiveAt: sessions.lastActiveAt });
  return row === undefined ? null : expiry(row.lastActiveAt);
}

// Logout: works with any cookie value, a valid session or not.
export async function deleteSessionByToken(
  db: Executor,
  token: string,
): Promise<void> {
  if (token.length === 0 || token.length > TOKEN_MAX_LENGTH) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
