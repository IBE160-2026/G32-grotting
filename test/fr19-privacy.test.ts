import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ctx,
  EXAMPLE_AD,
  EXAMPLE_CV,
  EXAMPLE_INPUTS,
  loadRoutes,
  OTHER_INPUTS,
  type Routes,
  type SavedFlow,
  saveWholeApplication,
  signUpWith,
  withCookie,
} from "./accounts-flow-kit";
import { ACCOUNTS_ENV, jsonRequest } from "./accounts-kit";

// FR-19, Story 6.12: two Students on the real routes and the real (PGlite)
// database, accounts on as they are by default. Student A has a Profile with a
// CV and a saved Application with every section. Student B knows A's
// Application id, A's fingerprint and even A's inputs, and tries every route
// that takes an id or reads or writes stored data. Each request that reaches
// for A's data answers NOT_FOUND, byte for byte as an id that does not exist,
// with nothing of A's in it, and A's rows stay as they were. Every test also
// reads the same thing as A, so a NOT_FOUND cannot come from a broken setup.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// Page: the real `getApplicationMeta` and database; only Next and the session
// of the page are replaced.
const page = vi.hoisted(() => ({ studentId: "" }));
class NotFound extends Error {}
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFound();
  },
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/modules/application/ui", () => ({ SavedApplication: () => null }));
vi.mock("@/modules/identity", async (original) => ({
  ...(await original<typeof import("@/modules/identity")>()),
  getPageSession: async () => ({ studentId: page.studentId }),
  requireStudentPage: async () => {},
}));

const ID_A = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";
const ID_A2 = "9e7f205b-3c4d-4e6f-9071-2b3c4d5e6f70";
const ID_B = "ab8a316c-4d5e-4f70-8182-3c4d5e6f7081";
const UNKNOWN = "00000000-0000-4000-8000-000000000003";
const MALFORMED = ["not-a-uuid", "..%2F..%2Fx", "0", "%00"];

const NAME_A = "Aurora Hemmelighet-Aas";
const NAME_B = "Bjørn Brandmur-Berg";
const CV_A = `${EXAMPLE_CV}\nProfil-markør-for-A-7f3a91`;
const CV_B = `${OTHER_INPUTS.cvText}\nProfil-markør-for-B-52c0de`;

let routes: Routes;
let a: { studentId: string; token: string };
let b: { studentId: string; token: string };
let flowA: SavedFlow;
let rowsOfAAtStart: string[];

// Strings that only A's data holds. None of them may appear in an answer to B.
function secretsOfA(): string[] {
  return [
    NAME_A,
    "Aurora",
    "Profil-markør-for-A-7f3a91",
    EXAMPLE_INPUTS.jobTitle,
    EXAMPLE_INPUTS.employer,
    EXAMPLE_AD.slice(0, 80),
    EXAMPLE_CV.slice(0, 80),
    flowA.letterText.slice(0, 80),
    ...flowA.gaps.map((gap) => gap.keyword),
    ...flowA.gaps.flatMap((gap) => (gap.suggestion ? [gap.suggestion] : [])),
    a.studentId,
    ID_A,
  ];
}

const norm = (text: string) => text.replace(/\r\n?/g, "\n");

async function answer(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    headers: [...response.headers.entries()]
      .filter(([name]) => name !== "x-session-expires-at")
      .sort(),
  };
}

function expectNothingOfA(text: string) {
  const haystack = norm(text).toLowerCase();
  for (const secret of secretsOfA()) {
    expect(haystack, `answer holds «${secret}»`).not.toContain(
      norm(secret).toLowerCase(),
    );
  }
}

// The row of A, whole, as the database holds it (ciphertext and all).
async function rawRowsOfA() {
  const result = await (await getDb()).execute(
    sql`select * from applications where student_id = ${a.studentId} order by seq`,
  );
  const rows = Array.isArray(result)
    ? result
    : (result as { rows: unknown[] }).rows;
  return JSON.stringify(rows);
}

async function rawProfileOfA() {
  const result = await (await getDb()).execute(
    sql`select * from profiles where student_id = ${a.studentId}`,
  );
  const rows = Array.isArray(result)
    ? result
    : (result as { rows: unknown[] }).rows;
  return JSON.stringify(rows);
}

beforeAll(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  routes = await loadRoutes();
  await (await getDb()).execute(sql`delete from students`);

  a = await signUpWith(routes, NAME_A, "aurora@example.test", "a-passord-1234");
  b = await signUpWith(routes, NAME_B, "bjorn@example.test", "b-passord-5678");

  for (const [token, cvText] of [
    [a.token, CV_A],
    [b.token, CV_B],
  ] as const) {
    const saved = await routes.profile.PUT(
      withCookie("/api/profile", token, { method: "PUT", body: { cvText } }),
    );
    expect(saved.status).toBe(200);
  }
  flowA = await saveWholeApplication(routes, a.token, ID_A);
  await saveWholeApplication(routes, a.token, ID_A2);
  // B has one Application of their own, another ad.
  const own = await routes.phaseOne(
    jsonRequest("/api/analyses", {
      cookie: b.token,
      body: { applicationId: ID_B, inputs: OTHER_INPUTS },
    }),
  );
  expect(own.status).toBe(200);
  rowsOfAAtStart = [await rawRowsOfA(), await rawProfileOfA()];
  expect(rowsOfAAtStart[0]).toContain(ID_A);
});

afterAll(closeDb);

const unchangedForA = async () => {
  expect([await rawRowsOfA(), await rawProfileOfA()]).toEqual(rowsOfAAtStart);
};

describe("the control: A reaches A's own data through the same routes", () => {
  it("reads the Application, its Letter, the list, the count and the Profile", async () => {
    const one = await routes.one(
      withCookie(`/api/applications/${ID_A}`, a.token),
      ctx(ID_A),
    );
    expect(one.status).toBe(200);
    const oneBody = await one.text();
    expect(oneBody).toContain(EXAMPLE_INPUTS.employer);
    expect(norm(oneBody)).toContain(
      norm(flowA.letterText).slice(0, 40).replace(/\n/g, "\\n"),
    );

    const letter = await routes.oneLetter(
      withCookie(`/api/applications/${ID_A}/letter`, a.token),
      ctx(ID_A),
    );
    expect(letter.status).toBe(200);
    expect(await letter.json()).toMatchObject({
      data: { text: flowA.letterText },
    });

    const list = await routes.applications(
      withCookie("/api/applications", a.token),
    );
    expect(await list.text()).toContain(ID_A2);
    expect(
      await (
        await routes.count(withCookie("/api/applications/count", a.token))
      ).json(),
    ).toMatchObject({ data: { total: 2 } });

    const profile = await routes.profile.GET(
      withCookie("/api/profile", a.token),
    );
    expect(await profile.json()).toMatchObject({
      data: { name: NAME_A, cvText: CV_A },
    });
  });

  it("opens the page of the Application for A", async () => {
    page.studentId = a.studentId;
    const { default: Page } = await import("../src/app/historikk/[id]/page");
    const element = (await Page({ params: Promise.resolve({ id: ID_A }) })) as {
      props: { id: string };
    };
    expect(element.props.id).toBe(ID_A);
  });
});

describe("FR-19: B cannot read A's Application", () => {
  it("answers one NOT_FOUND for A's id, an unknown id and a malformed id, on the Application and on its Letter", async () => {
    for (const [path, handler] of [
      ["/api/applications/", routes.one],
      ["/api/applications/%ID%/letter", routes.oneLetter],
    ] as const) {
      const url = (id: string) =>
        path.includes("%ID%") ? path.replace("%ID%", id) : `${path}${id}`;
      const foreign = await answer(
        await handler(withCookie(url(ID_A), b.token), ctx(ID_A)),
      );
      expect(foreign.status).toBe(404);
      expect(JSON.parse(foreign.body)).toEqual({
        ok: false,
        error: { code: "NOT_FOUND", retryable: false },
      });
      expectNothingOfA(foreign.body);
      expectNothingOfA(JSON.stringify(foreign.headers));
      for (const id of [UNKNOWN, ID_A2.replace("9e7f", "ffff"), ...MALFORMED]) {
        expect(
          await answer(await handler(withCookie(url(id), b.token), ctx(id))),
        ).toEqual(foreign);
      }
    }
    await unchangedForA();
  });

  it("gives B's own Application to B and the same NOT_FOUND for A's second id", async () => {
    const own = await routes.one(
      withCookie(`/api/applications/${ID_B}`, b.token),
      ctx(ID_B),
    );
    expect(own.status).toBe(200);
    expectNothingOfA(await own.text());
    const foreign = await routes.one(
      withCookie(`/api/applications/${ID_A2}`, b.token),
      ctx(ID_A2),
    );
    expect(foreign.status).toBe(404);
  });

  it("lists, counts and numbers only B's own, on every page B can ask for", async () => {
    for (const query of ["", "?page=1", "?page=2", "?page=3"]) {
      const response = await routes.applications(
        withCookie(`/api/applications${query}`, b.token),
      );
      const text = await response.text();
      expectNothingOfA(text);
      // B has one entry, so the total is 1 on every page and only the first
      // page shows it.
      expect(JSON.parse(text)).toMatchObject({ data: { total: 1 } });
      if (query === "" || query === "?page=1") expect(text).toContain(ID_B);
      else expect(text).not.toContain(ID_B);
    }
    const count = await routes.count(
      withCookie("/api/applications/count", b.token),
    );
    expect(await count.json()).toMatchObject({ data: { total: 1 } });
    const next = await routes.next(
      withCookie("/api/applications/next", b.token),
    );
    expect(await next.json()).toMatchObject({ data: { seq: 2 } });
    // A's own list is untouched by all of it.
    const mine = await routes.applications(
      withCookie("/api/applications", a.token),
    );
    expect(JSON.parse(await mine.text())).toMatchObject({ data: { total: 2 } });
  });

  it("opens the page of an Application as Ikke funnet for A's id and for an unknown one", async () => {
    page.studentId = b.studentId;
    const { default: Page } = await import("../src/app/historikk/[id]/page");
    for (const id of [ID_A, ID_A2, UNKNOWN, ...MALFORMED]) {
      await expect(
        Page({ params: Promise.resolve({ id }) }),
      ).rejects.toBeInstanceOf(NotFound);
    }
    const own = (await Page({ params: Promise.resolve({ id: ID_B }) })) as {
      props: { id: string };
    };
    expect(own.props.id).toBe(ID_B);
  });
});

describe("FR-19: B cannot work on A's Application", () => {
  const bodyFor = (fingerprint: string) => ({
    applicationId: ID_A,
    fingerprint,
    inputs: EXAMPLE_INPUTS,
  });

  it("answers NOT_FOUND to the Letter, the Gap analysis and the check, before any AI request, with A's own fingerprint and inputs", async () => {
    const handlers = {
      letter: routes.letter,
      gaps: routes.gaps,
      check: routes.check,
    };
    const pathOf = (call: keyof typeof handlers, id: string) =>
      `/api/analyses/${id}/${call === "check" ? "letter-check" : call}`;
    const unknown = async (call: keyof typeof handlers, body: object) =>
      answer(
        await handlers[call](
          jsonRequest(pathOf(call, UNKNOWN), {
            cookie: b.token,
            body: { ...body, applicationId: UNKNOWN },
          }),
          ctx(UNKNOWN),
        ),
      );
    const bodies = {
      letter: {
        ...bodyFor(flowA.fingerprint),
        tone: "Formell",
        consent: null,
        previousRev: 0,
      },
      gaps: { ...bodyFor(flowA.fingerprint), consent: null, previousRev: 0 },
      check: {
        ...bodyFor(flowA.fingerprint),
        letter: { text: flowA.letterText, tone: "Formell", rev: 1 },
        gaps: flowA.gaps,
        letterRev: 1,
        gapsRev: 1,
      },
    };
    for (const call of ["letter", "gaps", "check"] as const) {
      const response = await answer(
        await handlers[call](
          jsonRequest(pathOf(call, ID_A), {
            cookie: b.token,
            body: bodies[call],
          }),
          ctx(ID_A),
        ),
      );
      expect(response.status, call).toBe(404);
      expect(JSON.parse(response.body), call).toEqual({
        ok: false,
        error: { code: "NOT_FOUND", retryable: false },
      });
      expectNothingOfA(response.body);
      expect(await unknown(call, bodies[call]), call).toEqual(response);
    }
    await unchangedForA();
  });

  it("a request for A's id with B's own inputs gets the same NOT_FOUND and writes nothing", async () => {
    const response = await routes.letter(
      jsonRequest(`/api/analyses/${ID_A}/letter`, {
        cookie: b.token,
        body: {
          applicationId: ID_A,
          fingerprint: "0".repeat(64),
          inputs: OTHER_INPUTS,
          tone: "Formell",
          consent: null,
          previousRev: 0,
        },
      }),
      ctx(ID_A),
    );
    expect(response.status).toBe(404);
    await unchangedForA();
  });

  it("phase 1 with A's id saves nothing for B, takes nothing from A and overwrites nothing", async () => {
    const response = await routes.phaseOne(
      jsonRequest("/api/analyses", {
        cookie: b.token,
        body: {
          applicationId: ID_A,
          inputs: { ...OTHER_INPUTS, jobTitle: "Overtakelse-forsøk" },
        },
      }),
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text).data.saved).toBeNull();
    expectNothingOfA(text);
    await unchangedForA();
    const list = await routes.applications(
      withCookie("/api/applications", b.token),
    );
    expect(JSON.parse(await list.text())).toMatchObject({ data: { total: 1 } });
  });
});

describe("FR-19: B cannot read or change A's Profile", () => {
  it("B's Profile is B's, whatever id the request carries", async () => {
    const own = await routes.profile.GET(
      withCookie(
        `/api/profile?studentId=${a.studentId}&id=${a.studentId}`,
        b.token,
      ),
    );
    const text = await own.text();
    expect(JSON.parse(text)).toMatchObject({
      data: { name: NAME_B, cvText: CV_B },
    });
    expectNothingOfA(text);
  });

  it("B's save, with A's id in the query and in the body, changes only B's row", async () => {
    const response = await routes.profile.PUT(
      withCookie(`/api/profile?studentId=${a.studentId}`, b.token, {
        method: "PUT",
        body: {
          cvText: CV_B,
          studentId: a.studentId,
          id: a.studentId,
          name: "Overtatt Navn",
        },
      }),
    );
    expect(response.status).toBe(200);
    expectNothingOfA(await response.text());
    await unchangedForA();
    const mine = await routes.profile.GET(withCookie("/api/profile", a.token));
    expect(await mine.json()).toMatchObject({
      data: { name: NAME_A, cvText: CV_A },
    });
  });

  it("B accepting the AI notice, with A's id in the body, changes only B's Profile", async () => {
    const before = await (
      await routes.profile.GET(withCookie("/api/profile", a.token))
    ).json();
    const response = await routes.aiNotice(
      jsonRequest("/api/profile/ai-notice", {
        cookie: b.token,
        body: {
          noticeVersion: current.aiNotice.version,
          studentId: a.studentId,
        },
      }),
    );
    expect(response.status).toBe(200);
    const after = await (
      await routes.profile.GET(withCookie("/api/profile", a.token))
    ).json();
    expect(after).toEqual(before);
    expect(
      await (
        await routes.profile.GET(withCookie("/api/profile", b.token))
      ).json(),
    ).toMatchObject({ data: { aiNoticeVersion: current.aiNotice.version } });
    await unchangedForA();
  });
});

describe("FR-19: no session, no data", () => {
  it("every route that reads or writes stored data answers SESSION_EXPIRED without a session and with a made-up one, and holds nothing of A's", async () => {
    type Call = (cookie: string | undefined) => Promise<Response>;
    const calls: [string, Call][] = [
      ["profile GET", (c) => routes.profile.GET(withCookie("/api/profile", c))],
      [
        "profile PUT",
        (c) =>
          routes.profile.PUT(
            withCookie("/api/profile", c, {
              method: "PUT",
              body: { cvText: CV_A },
            }),
          ),
      ],
      ["list", (c) => routes.applications(withCookie("/api/applications", c))],
      [
        "phase 1",
        (c) =>
          routes.phaseOne(
            jsonRequest("/api/analyses", {
              cookie: c,
              body: { applicationId: ID_A, inputs: EXAMPLE_INPUTS },
            }),
          ),
      ],
      [
        "letter",
        (c) =>
          routes.letter(
            jsonRequest(`/api/analyses/${ID_A}/letter`, {
              cookie: c,
              body: {
                applicationId: ID_A,
                fingerprint: flowA.fingerprint,
                inputs: EXAMPLE_INPUTS,
                tone: "Formell",
                consent: null,
                previousRev: 0,
              },
            }),
            ctx(ID_A),
          ),
      ],
      [
        "gaps",
        (c) =>
          routes.gaps(
            jsonRequest(`/api/analyses/${ID_A}/gaps`, {
              cookie: c,
              body: {
                applicationId: ID_A,
                fingerprint: flowA.fingerprint,
                inputs: EXAMPLE_INPUTS,
                consent: null,
                previousRev: 0,
              },
            }),
            ctx(ID_A),
          ),
      ],
      [
        "letter check",
        (c) =>
          routes.check(
            jsonRequest(`/api/analyses/${ID_A}/letter-check`, {
              cookie: c,
              body: {
                applicationId: ID_A,
                fingerprint: flowA.fingerprint,
                inputs: EXAMPLE_INPUTS,
                letter: { text: flowA.letterText, tone: "Formell", rev: 1 },
                gaps: flowA.gaps,
                letterRev: 1,
                gapsRev: 1,
              },
            }),
            ctx(ID_A),
          ),
      ],
      [
        "AI notice",
        (c) =>
          routes.aiNotice(
            jsonRequest("/api/profile/ai-notice", {
              cookie: c,
              body: { noticeVersion: current.aiNotice.version },
            }),
          ),
      ],
      ["session", (c) => routes.session(withCookie("/api/session", c))],
      [
        "session renew",
        (c) =>
          routes.renew(withCookie("/api/session/renew", c, { method: "POST" })),
      ],
      [
        "CV upload",
        (c) =>
          routes.extract(
            new Request("http://localhost/api/cv/extract", {
              method: "POST",
              headers: c ? { cookie: `ja_sid=${c}` } : {},
              body: new FormData(),
            }),
          ),
      ],
      ["count", (c) => routes.count(withCookie("/api/applications/count", c))],
      ["next", (c) => routes.next(withCookie("/api/applications/next", c))],
      [
        "one",
        (c) =>
          routes.one(withCookie(`/api/applications/${ID_A}`, c), ctx(ID_A)),
      ],
      [
        "letter text",
        (c) =>
          routes.oneLetter(
            withCookie(`/api/applications/${ID_A}/letter`, c),
            ctx(ID_A),
          ),
      ],
    ];
    for (const [name, call] of calls) {
      for (const cookie of [undefined, "not-a-live-token", "0".repeat(43)]) {
        const response = await call(cookie);
        const text = await response.text();
        expect(response.status, `${name} ${cookie}`).toBe(401);
        expect(JSON.parse(text).error.code, name).toBe("SESSION_EXPIRED");
        expectNothingOfA(text);
      }
    }
    await unchangedForA();
  });
});
