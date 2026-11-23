import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { decryptText } from "@/shared/server/crypto";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ACCOUNTS_ENV,
  jsonRequest,
  signUp,
} from "../../../../test/accounts-kit";

// Story 6.7: the four /api/analyses routes with accounts on against a real
// (PGlite) `applications` table. Only what leaves the app is replaced: the
// Letter and Gap generators. Phase 1 is the real code path (Test mode, Cached
// Keyword list), so the fingerprints are the server's own.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
const log = vi.fn();
vi.mock("@/shared/server/log", () => ({ log: (event: unknown) => log(event) }));

// Writes pass through to the real repository unless a test makes one fail.
const failing = { analysis: false, letter: false, gaps: false, check: false };
vi.mock("@/modules/application", async (original) => {
  const actual = await original<typeof import("@/modules/application")>();
  const boom = () => Promise.reject(new Error("db is down"));
  return {
    ...actual,
    saveAnalysis: (...args: Parameters<typeof actual.saveAnalysis>) =>
      failing.analysis ? boom() : actual.saveAnalysis(...args),
    saveLetter: (...args: Parameters<typeof actual.saveLetter>) =>
      failing.letter ? boom() : actual.saveLetter(...args),
    saveGaps: (...args: Parameters<typeof actual.saveGaps>) =>
      failing.gaps ? boom() : actual.saveGaps(...args),
    saveLetterCheck: (...args: Parameters<typeof actual.saveLetterCheck>) =>
      failing.check ? boom() : actual.saveLetterCheck(...args),
  };
});
const generateLetter = vi.fn();
vi.mock("@/modules/letter", () => ({
  generateLetter: (...args: unknown[]) => generateLetter(...args),
}));
const analyseGaps = vi.fn();
vi.mock("@/modules/gaps", () => ({
  analyseGaps: (...args: unknown[]) => analyseGaps(...args),
}));

const { POST: register } = await import("../auth/register/route");
const { POST: login } = await import("../auth/login/route");
const { POST: phaseOne } = await import("./route");
const { POST: letterRoute } = await import("./[id]/letter/route");
const { POST: gapsRoute } = await import("./[id]/gaps/route");
const { POST: checkRoute } = await import("./[id]/letter-check/route");

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const ID_1 = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";
const ID_2 = "9e7f205b-3c4d-4e6f-9071-2b3c4d5e6f70";

type Phase1 = {
  data: { result: { score: number }; fingerprint: string; saved?: unknown };
};

async function analyse(
  cookie: string | undefined,
  applicationId: string,
  withInputs = inputs,
) {
  const response = await phaseOne(
    jsonRequest("/api/analyses", {
      cookie,
      body: { applicationId, inputs: withInputs },
    }),
  );
  return { response, body: (await response.json()) as Phase1 };
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const letterCall = (
  cookie: string | undefined,
  id: string,
  fingerprint: string,
  previousRev = 0,
) =>
  letterRoute(
    jsonRequest(`/api/analyses/${id}/letter`, {
      cookie,
      body: {
        applicationId: id,
        fingerprint,
        inputs,
        tone: "Formell",
        consent: null,
        previousRev,
      },
    }),
    ctx(id),
  );

const gapsCall = (
  cookie: string | undefined,
  id: string,
  fingerprint: string,
  previousRev = 0,
) =>
  gapsRoute(
    jsonRequest(`/api/analyses/${id}/gaps`, {
      cookie,
      body: {
        applicationId: id,
        fingerprint,
        inputs,
        consent: null,
        previousRev,
      },
    }),
    ctx(id),
  );

const checkCall = (
  cookie: string | undefined,
  id: string,
  fingerprint: string,
  revs = { letterRev: 1, gapsRev: 0 },
) =>
  checkRoute(
    jsonRequest(`/api/analyses/${id}/letter-check`, {
      cookie,
      body: {
        applicationId: id,
        fingerprint,
        inputs,
        letter: { text: "Hei der.", tone: "Formell", rev: revs.letterRev },
        gaps: null,
        ...revs,
      },
    }),
    ctx(id),
  );

// The row with its encrypted sections opened (`{ contractVersion, data }`).
async function rowOf(id: string) {
  const result = await (await getDb()).execute(
    sql`select * from applications where id = ${id}`,
  );
  const [raw] = (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
  if (raw === undefined) return undefined;
  const open = (value: unknown) =>
    value === null ? null : JSON.parse(decryptText(String(value)));
  return {
    studentId: raw.student_id,
    seq: raw.seq,
    matchScore: raw.match_score,
    fingerprint: raw.fingerprint,
    letterRev: raw.letter_rev,
    gapsRev: raw.gaps_rev,
    job: open(raw.job),
    analysis: open(raw.analysis),
    letter: open(raw.letter),
    gaps: open(raw.gaps),
    letterCheck: open(raw.letter_check),
  };
}

async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

const LETTER = { text: "Kjære Nordic Digital", tone: "Formell", rev: 1 };
const GAPS = [
  {
    keyword: "Kubernetes",
    kind: "real",
    explanation: { key: "REAL_GAP", params: { keyword: "Kubernetes" } },
    citation: null,
    suggestion: null,
  },
];

beforeEach(async () => {
  current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_GAPS: "true" });
  log.mockReset();
  generateLetter.mockReset();
  analyseGaps.mockReset();
  failing.analysis = false;
  failing.letter = false;
  failing.gaps = false;
  failing.check = false;
  // As the real generator: the next rev after the one the client sends.
  generateLetter.mockImplementation(async (input: { previousRev: number }) => ({
    ok: true,
    value: {
      letter: { ...LETTER, rev: input.previousRev + 1 },
      meta: {},
    },
  }));
  analyseGaps.mockResolvedValue({
    ok: true,
    value: { gaps: GAPS, meta: null },
  });
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

const newStudent = (name: string, email: string) =>
  signUp(register, login, name, email);

describe("Story 6.7 POST /api/analyses saves the Application", () => {
  it("saves a first Application as seq 1 with the score and answers saved", async () => {
    const { token, studentId } = await newStudent("Anna Aas", "a@example.test");
    const { response, body } = await analyse(token, ID_1);
    expect(response.status).toBe(200);
    expect(body.data.saved).toEqual({ seq: 1 });
    expect(body.data.result.score).toBeGreaterThanOrEqual(0);
    const row = await rowOf(ID_1);
    expect(row).toMatchObject({
      studentId,
      seq: 1,
      matchScore: body.data.result.score,
      fingerprint: body.data.fingerprint,
      letter: null,
      gaps: null,
      letterCheck: null,
    });
  });

  it("numbers a second Application 2 and keeps the number on a double submit", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    await analyse(token, ID_1);
    expect((await analyse(token, ID_2)).body.data.saved).toEqual({ seq: 2 });
    expect((await analyse(token, ID_1)).body.data.saved).toEqual({ seq: 1 });
    expect((await analyse(token, ID_2)).body.data.saved).toEqual({ seq: 2 });
  });

  it("replaces the inputs of the same id when they change, keeping the number", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    await analyse(token, ID_1);
    const changed = { ...inputs, jobTitle: "Annen stilling" };
    const { body } = await analyse(token, ID_1, changed);
    expect(body.data.saved).toEqual({ seq: 1 });
    const row = await rowOf(ID_1);
    expect(row?.fingerprint).toBe(body.data.fingerprint);
    expect(row?.job).toMatchObject({ data: { jobTitle: "Annen stilling" } });
  });

  it("answers saved null for an id that is another Student's and writes nothing", async () => {
    const a = await newStudent("Anna Aas", "a@example.test");
    const b = await newStudent("Bjørn Berg", "b@example.test");
    await analyse(a.token, ID_1);
    const before = await rowOf(ID_1);
    const { response, body } = await analyse(b.token, ID_1, {
      ...inputs,
      jobTitle: "Overtakelse",
    });
    expect(response.status).toBe(200);
    expect(body.data.saved).toBeNull();
    expect(body.data.result.score).toBeGreaterThanOrEqual(0);
    expect(await rowOf(ID_1)).toEqual(before);
  });

  it("still answers the result with saved null when the save fails, and logs the code only", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    failing.analysis = true;
    const { response, body } = await analyse(token, ID_1);
    expect(response.status).toBe(200);
    expect(body.data.saved).toBeNull();
    expect(body.data.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await rowOf(ID_1)).toBeUndefined();
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "UNEXPECTED",
      errorName: "Error",
      route: "/api/analyses",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("db is down");
  });

  it("stores nothing and has no saved key with accounts off", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    const { response, body } = await analyse(undefined, ID_1);
    expect(response.status).toBe(200);
    expect("saved" in body.data).toBe(false);
    expect(await rowOf(ID_1)).toBeUndefined();
  });
});

describe("Story 6.7 phase-2 routes write their part", () => {
  async function savedBy(token: string, id = ID_1) {
    const { body } = await analyse(token, id);
    return body.data.fingerprint;
  }

  it("writes the Letter and counts it; a failed Letter leaves the row as it was", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    expect((await letterCall(token, ID_1, fingerprint)).status).toBe(200);
    let row = await rowOf(ID_1);
    expect(row?.letterRev).toBe(1);
    expect(row?.letter).toMatchObject({ data: LETTER });

    generateLetter.mockResolvedValue({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
    expect((await letterCall(token, ID_1, fingerprint)).status).toBe(502);
    row = await rowOf(ID_1);
    expect(row?.letterRev).toBe(1);
    expect(row?.letter).toMatchObject({ data: LETTER });
  });

  it("writes the Gaps and counts them; a failed Gap analysis writes nothing", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    analyseGaps.mockResolvedValueOnce({
      ok: false,
      error: { code: "AI_TIMEOUT", retryable: true },
    });
    expect((await gapsCall(token, ID_1, fingerprint)).status).toBe(502);
    expect((await rowOf(ID_1))?.gaps).toBeNull();
    expect((await gapsCall(token, ID_1, fingerprint)).status).toBe(200);
    const row = await rowOf(ID_1);
    expect(row?.gapsRev).toBe(1);
    expect(row?.gaps).toMatchObject({ data: GAPS });
  });

  it("stores the check only for the revs the row has, and answers the flags either way", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    await letterCall(token, ID_1, fingerprint);

    const stale = await checkCall(token, ID_1, fingerprint, {
      letterRev: 5,
      gapsRev: 0,
    });
    expect(stale.status).toBe(200);
    expect(
      ((await stale.json()) as { data: { flags: unknown } }).data.flags,
    ).toEqual(expect.any(Array));
    expect((await rowOf(ID_1))?.letterCheck).toBeNull();

    expect((await checkCall(token, ID_1, fingerprint)).status).toBe(200);
    expect((await rowOf(ID_1))?.letterCheck).toMatchObject({
      data: { letterRev: 1, gapsRev: 0 },
    });
  });

  it("answers normally and logs by code and route when a write fails", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    failing.letter = failing.gaps = failing.check = true;
    expect((await letterCall(token, ID_1, fingerprint)).status).toBe(200);
    expect((await gapsCall(token, ID_1, fingerprint)).status).toBe(200);
    expect((await checkCall(token, ID_1, fingerprint)).status).toBe(200);
    const routes = log.mock.calls.map(([event]) => event.route).sort();
    expect(routes).toEqual([
      "/api/analyses/[id]/gaps",
      "/api/analyses/[id]/letter",
      "/api/analyses/[id]/letter-check",
    ]);
    for (const [event] of log.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "code",
        "errorName",
        "kind",
        "route",
      ]);
    }
    const row = await rowOf(ID_1);
    expect(row).toMatchObject({ letter: null, gaps: null, letterCheck: null });
  });

  it("logs and keeps the old row when the fingerprint is not the row's", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    // The row moved on to other inputs while this request was in flight.
    await (await getDb()).execute(
      sql`update applications set fingerprint = 'other' where id = ${ID_1}`,
    );
    expect((await letterCall(token, ID_1, fingerprint)).status).toBe(200);
    expect((await rowOf(ID_1))?.letter).toBeNull();
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "ANALYSIS_STALE",
      errorName: "NoRowWritten",
      route: "/api/analyses/[id]/letter",
    });
  });

  it("keeps the check storable after a same-fingerprint resubmit, the client restarting its Letter rev", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    expect((await letterCall(token, ID_1, fingerprint, 0)).status).toBe(200);
    expect((await rowOf(ID_1))?.letterRev).toBe(1);

    // Phase 1 again with the same inputs changes nothing.
    const before = await rowOf(ID_1);
    expect((await analyse(token, ID_1)).body.data.saved).toEqual({ seq: 1 });
    expect(await rowOf(ID_1)).toEqual(before);

    // The client starts over at rev 0; the row follows it instead of counting on.
    expect((await letterCall(token, ID_1, fingerprint, 0)).status).toBe(200);
    expect((await rowOf(ID_1))?.letterRev).toBe(1);
    expect(
      (await checkCall(token, ID_1, fingerprint, { letterRev: 1, gapsRev: 0 }))
        .status,
    ).toBe(200);
    expect((await rowOf(ID_1))?.letterCheck).toMatchObject({
      data: { letterRev: 1, gapsRev: 0 },
    });

    // «Lag nytt utkast» continues from the Letter shown.
    await letterCall(token, ID_1, fingerprint, 1);
    expect((await rowOf(ID_1))?.letterRev).toBe(2);
  });

  it("does the same for the Gap analysis: previousRev 0 twice, then a check with both revs", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    await letterCall(token, ID_1, fingerprint, 0);
    expect((await gapsCall(token, ID_1, fingerprint, 0)).status).toBe(200);
    expect((await rowOf(ID_1))?.gapsRev).toBe(1);
    await analyse(token, ID_1);
    expect((await gapsCall(token, ID_1, fingerprint, 0)).status).toBe(200);
    expect((await rowOf(ID_1))?.gapsRev).toBe(1);
    expect(
      (await checkCall(token, ID_1, fingerprint, { letterRev: 1, gapsRev: 1 }))
        .status,
    ).toBe(200);
    expect((await rowOf(ID_1))?.letterCheck).toMatchObject({
      data: { letterRev: 1, gapsRev: 1 },
    });
    // A retry after the first Gap analysis follows the client's counter.
    await gapsCall(token, ID_1, fingerprint, 1);
    expect((await rowOf(ID_1))?.gapsRev).toBe(2);
  });

  it("leaves no plain text of the ad, title, employer, CV or Letter in any column after a full flow", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    await letterCall(token, ID_1, fingerprint);
    await gapsCall(token, ID_1, fingerprint);
    await checkCall(token, ID_1, fingerprint, { letterRev: 1, gapsRev: 1 });
    const row = await rowOf(ID_1);
    expect(row?.letter).not.toBeNull();
    expect(row?.gaps).not.toBeNull();
    expect(row?.letterCheck).not.toBeNull();

    const raw = JSON.stringify(
      await (await getDb()).execute(sql`select * from applications`),
    );
    const snippet = (text: string) =>
      text.replace(/\s+/g, " ").trim().slice(0, 40);
    for (const word of [
      snippet(inputs.cvText),
      snippet(inputs.jobAd),
      inputs.jobTitle,
      inputs.employer,
      LETTER.text,
      "Kubernetes",
    ]) {
      expect(raw).not.toContain(word);
    }
    // The CV text is in no column at all, encrypted or not: only the request
    // carries it.
    expect(raw).not.toContain(inputs.cvText.slice(0, 40));
  });

  it("gives NOT_FOUND, no AI request and an untouched row to another Student (FR-19)", async () => {
    const a = await newStudent("Anna Aas", "a@example.test");
    const b = await newStudent("Bjørn Berg", "b@example.test");
    const fingerprint = await savedBy(a.token);
    const before = await rowOf(ID_1);
    for (const call of [
      () => letterCall(b.token, ID_1, fingerprint),
      () => gapsCall(b.token, ID_1, fingerprint),
      () => checkCall(b.token, ID_1, fingerprint),
    ]) {
      const response = await call();
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("NOT_FOUND");
    }
    expect(generateLetter).not.toHaveBeenCalled();
    expect(analyseGaps).not.toHaveBeenCalled();
    expect(await rowOf(ID_1)).toEqual(before);
  });

  it("gives an id that does not exist the same NOT_FOUND", async () => {
    const { token } = await newStudent("Anna Aas", "a@example.test");
    const fingerprint = await savedBy(token);
    for (const call of [
      () => letterCall(token, ID_2, fingerprint),
      () => gapsCall(token, ID_2, fingerprint),
      () => checkCall(token, ID_2, fingerprint),
    ]) {
      expect(await errorCode(await call())).toBe("NOT_FOUND");
    }
    expect(generateLetter).not.toHaveBeenCalled();
    expect(analyseGaps).not.toHaveBeenCalled();
  });

  it("is unchanged with accounts off: no row is needed and none is written", async () => {
    current = parseConfig({
      ...ACCOUNTS_ENV,
      FEATURE_ACCOUNTS: "false",
      FEATURE_GAPS: "true",
    });
    const { body } = await analyse(undefined, ID_1);
    const { fingerprint } = body.data;
    expect((await letterCall(undefined, ID_1, fingerprint)).status).toBe(200);
    expect((await gapsCall(undefined, ID_1, fingerprint)).status).toBe(200);
    expect((await checkCall(undefined, ID_1, fingerprint)).status).toBe(200);
    expect(await rowOf(ID_1)).toBeUndefined();
  });
});
