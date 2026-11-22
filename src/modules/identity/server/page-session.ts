import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { SESSION_COOKIE } from "../contracts";
import type { StudentSession } from "./handle-student";
import { lookupSession } from "./sessions";

// The session behind the page being rendered, or null: accounts off, no cookie,
// an unknown or expired one. Looked up once per request, so the layout (app
// bar) and the page share one query. Like any request, it extends the session
// at most every 5 minutes (AD-12). Never read from the body or the URL.
export const getPageSession = cache(
  async (): Promise<StudentSession | null> => {
    if (!getConfig().features.accounts) return null;
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token === undefined || token === "") return null;
    return lookupSession(await getDb(), token, new Date());
  },
);

// Where a logged-out Student is sent (FR-18, UX-DR33).
export const LOGIN_PATH = "/logg-inn";

// Called by a Student page (Søknad, Profil, Historikk, Konto): with accounts on
// and no live session it redirects to Logg inn; with accounts off it does
// nothing, so the app is as it was before accounts. It throws the redirect, so
// it must not sit inside a try block.
export async function requireStudentPage(): Promise<void> {
  if (!getConfig().features.accounts) return;
  if ((await getPageSession()) === null) redirect(LOGIN_PATH);
}
