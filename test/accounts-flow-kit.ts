import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { jsonRequest } from "./accounts-kit";

// Shared by the FR-19 and FR-22 suites of Story 6.12: the real routes, on the
// real (PGlite) database, in Test mode on the Cached answers of the Example
// pair, so one Student can go through the whole flow and leave a saved
// Application with every section. Not a test file itself. The importing test
// mocks `@/shared/server/config` (and the log) before calling `loadRoutes`.

const DIR = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${DIR}/meta.json`, "utf8")) as {
  jobTitle: string;
  employer: string;
};

export const EXAMPLE_CV = readFileSync(`${DIR}/cv.txt`, "utf8");
export const EXAMPLE_AD = readFileSync(`${DIR}/ad.txt`, "utf8");
export const EXAMPLE_INPUTS = {
  cvText: EXAMPLE_CV,
  jobAd: EXAMPLE_AD,
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};

// Another pair, for the second Student: a different ad, title and employer.
const OTHER_DIR = "data/fixtures/two-column-fjord-analytics";
const otherMeta = JSON.parse(
  readFileSync(`${OTHER_DIR}/meta.json`, "utf8"),
) as { jobTitle: string; employer: string };
export const OTHER_INPUTS = {
  cvText: readFileSync(`${OTHER_DIR}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${OTHER_DIR}/ad.txt`, "utf8"),
  jobTitle: otherMeta.jobTitle,
  employer: otherMeta.employer,
};

export type Inputs = typeof EXAMPLE_INPUTS;

export async function loadRoutes() {
  return {
    register: (await import("../src/app/api/auth/register/route")).POST,
    login: (await import("../src/app/api/auth/login/route")).POST,
    profile: await import("../src/app/api/profile/route"),
    aiNotice: (await import("../src/app/api/profile/ai-notice/route")).POST,
    applications: (await import("../src/app/api/applications/route")).GET,
    count: (await import("../src/app/api/applications/count/route")).GET,
    next: (await import("../src/app/api/applications/next/route")).GET,
    one: (await import("../src/app/api/applications/[id]/route")).GET,
    oneLetter: (await import("../src/app/api/applications/[id]/letter/route"))
      .GET,
    phaseOne: (await import("../src/app/api/analyses/route")).POST,
    letter: (await import("../src/app/api/analyses/[id]/letter/route")).POST,
    gaps: (await import("../src/app/api/analyses/[id]/gaps/route")).POST,
    check: (await import("../src/app/api/analyses/[id]/letter-check/route"))
      .POST,
    extract: (await import("../src/app/api/cv/extract/route")).POST,
    session: (await import("../src/app/api/session/route")).GET,
    renew: (await import("../src/app/api/session/renew/route")).POST,
  };
}
export type Routes = Awaited<ReturnType<typeof loadRoutes>>;

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

export const withCookie = (
  path: string,
  cookie: string | undefined,
  init: { method?: string; body?: unknown } = {},
) =>
  new Request(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

// Registers and logs in through the real routes, with the given password.
export async function signUpWith(
  routes: Routes,
  name: string,
  email: string,
  password: string,
): Promise<{ studentId: string; token: string }> {
  const registered = await routes.register(
    jsonRequest("/api/auth/register", { body: { name, email, password } }),
  );
  expect(registered.status).toBe(200);
  const studentId = (
    (await registered.json()) as { data: { studentId: string } }
  ).data.studentId;
  const signed = await routes.login(
    jsonRequest("/api/auth/login", { body: { email, password } }),
  );
  expect(signed.status).toBe(200);
  const cookie = signed.headers.getSetCookie()[0] ?? "";
  return {
    studentId,
    token: cookie.split(";")[0]?.slice("ja_sid=".length) ?? "",
  };
}

export type SavedFlow = {
  fingerprint: string;
  letterText: string;
  gaps: { keyword: string; suggestion: string | null }[];
};

// Phase 1, the Gap analysis, the Letter and its check, as the browser sends
// them, so the Application ends with every section written.
export async function saveWholeApplication(
  routes: Routes,
  token: string,
  applicationId: string,
  inputs: Inputs = EXAMPLE_INPUTS,
): Promise<SavedFlow> {
  const one = await routes.phaseOne(
    jsonRequest("/api/analyses", {
      cookie: token,
      body: { applicationId, inputs },
    }),
  );
  expect(one.status).toBe(200);
  const oneBody = (await one.json()) as {
    data: { fingerprint: string; saved: { seq: number } | null };
  };
  expect(oneBody.data.saved).not.toBeNull();
  const { fingerprint } = oneBody.data;

  const gapsResponse = await routes.gaps(
    jsonRequest(`/api/analyses/${applicationId}/gaps`, {
      cookie: token,
      body: {
        applicationId,
        fingerprint,
        inputs,
        consent: null,
        previousRev: 0,
      },
    }),
    ctx(applicationId),
  );
  expect(gapsResponse.status).toBe(200);
  const gaps = (
    (await gapsResponse.json()) as {
      data: { gaps: SavedFlow["gaps"] };
    }
  ).data.gaps;

  const letterResponse = await routes.letter(
    jsonRequest(`/api/analyses/${applicationId}/letter`, {
      cookie: token,
      body: {
        applicationId,
        fingerprint,
        inputs,
        tone: "Formell",
        consent: null,
        previousRev: 0,
      },
    }),
    ctx(applicationId),
  );
  expect(letterResponse.status).toBe(200);
  const letter = (
    (await letterResponse.json()) as {
      data: { letter: { text: string; tone: string; rev: number } };
    }
  ).data.letter;

  const checkResponse = await routes.check(
    jsonRequest(`/api/analyses/${applicationId}/letter-check`, {
      cookie: token,
      body: {
        applicationId,
        fingerprint,
        inputs,
        letter,
        gaps,
        letterRev: letter.rev,
        gapsRev: 1,
      },
    }),
    ctx(applicationId),
  );
  expect(checkResponse.status).toBe(200);
  return { fingerprint, letterText: letter.text, gaps };
}
