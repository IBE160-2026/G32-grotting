import "server-only";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { ApiError, type HandlerContext, handle } from "@/shared/server/handle";
import { readSessionToken } from "./cookie";
import { lookupSession } from "./sessions";

// What a Student route knows about the caller: always from the session, never
// from the body or the URL (AD-10).
export type StudentSession = {
  readonly studentId: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
};

export type StudentContext = HandlerContext<StudentSession>;

// While `FEATURE_ACCOUNTS` is off the account routes do not exist (NOT_FOUND,
// as the app after Epic 5).
export function assertAccountsOn(): void {
  if (!getConfig().features.accounts) throw new ApiError("NOT_FOUND");
}

// A route that needs a logged-in Student: accounts on, a `ja_sid` cookie that
// names a live session (extended at most every 5 minutes), else 401
// SESSION_EXPIRED. The response carries `X-Session-Expires-At`.
export function handleStudent<T>(
  route: string,
  fn: (request: Request, ctx: StudentContext) => Promise<T> | T,
): (request: Request) => Promise<Response> {
  return handle<T, StudentSession>(route, fn, {
    authenticate: async (request) => {
      assertAccountsOn();
      const token = readSessionToken(request);
      if (token === undefined) throw new ApiError("SESSION_EXPIRED");
      const found = await lookupSession(await getDb(), token, new Date());
      if (found === null) throw new ApiError("SESSION_EXPIRED");
      return { session: found, expiresAt: found.expiresAt };
    },
  });
}

// A route that serves both modes (Story 6.6): with accounts on it is
// `handleStudent` (a live session, `ctx.session` set); with them off it is the
// plain `handle` as after Epic 5, and `ctx.session` is `undefined`. The switch
// is made per request, since the flag is read at run time, never at build time
// (AD-4).
export function handleCaller<T>(
  route: string,
  fn: (
    request: Request,
    ctx: HandlerContext<StudentSession | undefined>,
  ) => Promise<T> | T,
): (request: Request) => Promise<Response> {
  const plain = handle<T, undefined>(route, fn);
  const withSession = handleStudent(route, fn);
  return (request) =>
    getConfig().features.accounts ? withSession(request) : plain(request);
}
