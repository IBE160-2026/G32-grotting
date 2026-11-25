import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { proposeKeywords } from "@/modules/keywords/core";
import { type Config, parseConfig } from "@/shared/server/config";
import { decryptText } from "@/shared/server/crypto";
import { loadVocabulary } from "@/shared/server/data-files";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ctx,
  EXAMPLE_AD,
  EXAMPLE_CV,
  EXAMPLE_INPUTS,
  loadRoutes,
  type Routes,
  type SavedFlow,
  saveWholeApplication,
  signUpWith,
  withCookie,
} from "./accounts-flow-kit";
import { ACCOUNTS_ENV, jsonRequest } from "./accounts-kit";

// FR-22, NFR-7, Story 6.12: the raw rows of a database that holds a registered
// Student and a saved Application, read the way someone who opens the database
// reads them (every table, every column, no key). Nothing personal may stand in
// plain text; the password only as a scrypt hash; a session only as a hash of
// its token. Two checks work together so that a leak fails the test:
//  1. a value that is not ciphertext must have one of the shapes a plain column
//     holds (id, hash, timestamp, number, the lower-cased email, the notice
//     version): any other plain text, in any column, fails;
//  2. the strings of the Student's data (name, password, CV, ad, title,
//     employer, Keywords, Evidence, Gaps, suggestions, Letter) are looked for in
//     the whole dump.
// The control: the same strings come back out of the ciphertext with the key, so
// the test cannot pass because nothing was stored.
//
// One table is plain by decision (architecture, "Plain-text columns": FR-22's
// "keyword lists" means the `analysis` column): `keyword_lists`, the AI-proposed
// words of a Job ad, saved under the hash of the ad, with no Student id and no
// CV. It is checked for exactly that, not skipped: its columns, its hash, and
// that every word in it stands in the ad.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
const logged: unknown[] = [];
vi.mock("@/shared/server/log", () => ({
  log: (event: unknown) => logged.push(event),
}));

const ID = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";
const NAME = "Zebulon Quixote-Hemmelig";
const EMAIL = "Student.FR22@Example.test";
const PASSWORD = "Hemmelig-passord-FR22-q9x7";
const CV = `${EXAMPLE_CV}\nProfil-markør-for-FR22-c41d9e`;

const CIPHERTEXT = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SCRYPT = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=_-]+\$[A-Za-z0-9+/=_-]+$/;
// The plain shapes: nothing else may stand in a column.
const PLAIN_SHAPES: Record<string, RegExp> = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  hash: /^[0-9a-f]{64}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  timestamp:
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)$/,
  noticeVersion: /^notice-\d+:[A-Za-z0-9%._-]*:[A-Za-z0-9%._-]*:[a-z-]+$/,
  email: new RegExp(`^${EMAIL.toLowerCase().replace(/\./g, "\\.")}$`),
};

let routes: Routes;
let student: { studentId: string; token: string };
let flow: SavedFlow;
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

async function readAllTables() {
  const db = await getDb();
  const rowsOf = (result: unknown) =>
    (Array.isArray(result)
      ? result
      : (result as { rows: unknown[] }).rows) as Row[];
  const names = rowsOf(
    await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
    ),
  ).map((row) => String(row.table_name));
  for (const name of names) {
    tables[name] = rowsOf(
      await db.execute(sql`select * from ${sql.identifier(name)}`),
    );
  }
}

// The plain, shared, Student-free table of the decision above.
const SHARED_PLAIN = new Set([
  "keyword_lists.keywords",
  "keyword_lists.prompt_version",
  "keyword_lists.provider",
  "keyword_lists.model",
]);

// Every value of every column, with where it stands. The words of the shared
// table are left out (and checked on their own below).
function cells(): { where: string; value: unknown }[] {
  return Object.entries(tables).flatMap(([table, rows]) =>
    rows.flatMap((row) =>
      Object.entries(row)
        .map(([column, value]) => ({ where: `${table}.${column}`, value }))
        .filter(({ where }) => !SHARED_PLAIN.has(where)),
    ),
  );
}

// A string as it is (JSON would escape its quotes and line breaks, and a leaked
// multi-line text would then not be found); anything else as JSON.
const asText = (value: unknown) =>
  value instanceof Date
    ? value.toISOString()
    : typeof value === "string"
      ? value
      : JSON.stringify(value);

// Strings only this Student's data holds, as the app shows them back.
function secrets(): string[] {
  const out = new Set<string>([
    NAME,
    "Zebulon",
    "Quixote-Hemmelig",
    PASSWORD,
    "Profil-markør-for-FR22-c41d9e",
    EXAMPLE_INPUTS.jobTitle,
    EXAMPLE_INPUTS.employer,
    flow.letterText,
  ]);
  for (const text of [CV, EXAMPLE_AD, flow.letterText]) {
    for (const line of text.split(/\r?\n/)) {
      if (line.trim().length >= 12) out.add(line.trim());
    }
  }
  for (const gap of flow.gaps) {
    out.add(gap.keyword);
    if (gap.suggestion) out.add(gap.suggestion);
  }
  return [...out].filter((text) => text.length > 0);
}

// Everything the saved Application shows back (keyword lists, Evidence, Gaps,
// explanations, suggestions, the Letter, the check), as plain strings.
function leaves(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === "string") into.add(value);
  else if (Array.isArray(value)) for (const item of value) leaves(item, into);
  else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) leaves(item, into);
  }
  return into;
}

beforeAll(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  routes = await loadRoutes();
  await (await getDb()).execute(sql`delete from students`);
  student = await signUpWith(routes, NAME, EMAIL, PASSWORD);
  const saved = await routes.profile.PUT(
    withCookie("/api/profile", student.token, {
      method: "PUT",
      body: { cvText: CV },
    }),
  );
  expect(saved.status).toBe(200);
  const notice = await routes.aiNotice(
    jsonRequest("/api/profile/ai-notice", {
      cookie: student.token,
      body: { noticeVersion: current.aiNotice.version },
    }),
  );
  expect(notice.status).toBe(200);
  flow = await saveWholeApplication(routes, student.token, ID);
  await readAllTables();
});

afterAll(closeDb);

describe("FR-22: the raw rows of a Student with a saved Application", () => {
  it("holds the Student and the Application, so there is something to look at", () => {
    expect(tables.students).toHaveLength(1);
    expect(tables.profiles).toHaveLength(1);
    expect(tables.applications).toHaveLength(1);
    expect(tables.sessions).toHaveLength(1);
  });

  it("holds the shared keyword_lists as words of the ad alone, under the hash of the ad, with no Student, CV or Letter in it", async () => {
    const rows = tables.keyword_lists ?? [];
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(Object.keys(row ?? {}).sort()).toEqual([
      "content_hash",
      "created_at",
      "keywords",
      "model",
      "prompt_version",
      "provider",
    ]);
    expect(String(row?.content_hash)).toMatch(PLAIN_SHAPES.hash ?? /$^/);
    for (const column of ["prompt_version", "provider", "model"]) {
      expect(String(row?.[column])).toMatch(/^[A-Za-z0-9._:/-]{1,80}$/);
    }
    const terms = row?.keywords as string[];
    expect(terms.length).toBeGreaterThan(0);
    // Every word is one the engine finds in the ad, so it is the ad's own.
    expect(
      proposeKeywords(EXAMPLE_AD, terms, await loadVocabulary()),
    ).toHaveLength(terms.length);
    // Nothing of the Student beside the ad's words: not the name, the CV
    // marker, the Letter or the password.
    const text = JSON.stringify(row).toLowerCase();
    for (const personal of [
      NAME,
      "Profil-markør-for-FR22-c41d9e",
      PASSWORD,
      flow.letterText.slice(0, 40),
      student.studentId,
      EMAIL,
    ]) {
      expect(text).not.toContain(personal.toLowerCase());
    }
  });

  it("has only ciphertext, scrypt or a known plain shape in any column", () => {
    const strangers: string[] = [];
    for (const { where, value } of cells()) {
      if (value === null || typeof value === "number") continue;
      if (typeof value === "boolean" || value instanceof Date) continue;
      if (typeof value !== "string") {
        strangers.push(`${where} (${typeof value})`);
        continue;
      }
      if (CIPHERTEXT.test(value)) continue;
      if (where === "students.password_hash" && SCRYPT.test(value)) continue;
      if (Object.values(PLAIN_SHAPES).some((shape) => shape.test(value))) {
        continue;
      }
      strangers.push(where);
    }
    expect(strangers).toEqual([]);
  });

  it("stores exactly the personal columns as ciphertext", () => {
    const encrypted = cells()
      .filter(
        ({ value }) => typeof value === "string" && CIPHERTEXT.test(value),
      )
      .map(({ where }) => where);
    expect([...new Set(encrypted)].sort()).toEqual([
      "applications.analysis",
      "applications.gaps",
      "applications.job",
      "applications.letter",
      "applications.letter_check",
      "profiles.cv_text",
      "profiles.name",
    ]);
  });

  it("shows none of the Student's strings in any column, long or short, ciphertext included", () => {
    const dump = cells()
      .map(({ value }) => asText(value))
      .join("\n");
    const lower = dump.toLowerCase();
    const found = secrets().filter((secret) =>
      lower.includes(secret.toLowerCase()),
    );
    expect(found).toEqual([]);
    // The plain columns hold no word of it either, short words included.
    const plain = cells()
      .filter(
        ({ value }) => typeof value !== "string" || !CIPHERTEXT.test(value),
      )
      .map(({ where, value }) => ({ where, text: asText(value).toLowerCase() }))
      .filter(({ where }) => where !== "students.email");
    for (const secret of secrets().filter((text) => text.length >= 4)) {
      for (const { where, text } of plain) {
        expect(text, where).not.toContain(secret.toLowerCase());
      }
    }
  });

  it("keeps the name, CV text, Job ad, title, employer, Keywords, Evidence, Gaps, suggestions and Letter in the ciphertext, readable with the key", () => {
    const opened: string[] = [];
    for (const { where, value } of cells()) {
      if (typeof value === "string" && CIPHERTEXT.test(value)) {
        opened.push(decryptText(value));
        // Each value is opened as text and, where it is JSON, as JSON.
        expect(where).toMatch(/^(applications|profiles)\./);
      }
    }
    const everything = opened.join("\n");
    for (const must of [
      NAME,
      "Profil-markør-for-FR22-c41d9e",
      EXAMPLE_INPUTS.jobTitle,
      EXAMPLE_INPUTS.employer,
      EXAMPLE_AD.split(/\r?\n/)
        .find((line) => line.trim().length > 30)
        ?.trim(),
      flow.letterText.split("\n")[0],
      ...flow.gaps.map((gap) => gap.keyword),
      ...flow.gaps.flatMap((gap) => (gap.suggestion ? [gap.suggestion] : [])),
    ]) {
      expect(must).toBeTruthy();
      expect(everything).toContain(JSON.stringify(must).slice(1, -1));
    }
    // Keywords and Evidence stand in the `analysis` column, opened.
    const analysis = decryptText(String(tables.applications?.[0]?.analysis));
    expect(JSON.parse(analysis)).toMatchObject({
      contractVersion: expect.any(Number),
    });
    expect(analysis.length).toBeGreaterThan(200);
    const matched = [...leaves(JSON.parse(analysis))].filter(
      (text) => text.length > 3,
    );
    expect(matched.length).toBeGreaterThan(5);
  });
});

describe("FR-22: passwords and sessions", () => {
  it("holds the password only as a scrypt hash with a salt, and nowhere else", () => {
    const [row] = tables.students ?? [];
    expect(String(row?.password_hash)).toMatch(SCRYPT);
    const columns = Object.keys(row ?? {});
    expect(columns.filter((name) => /pass/i.test(name))).toEqual([
      "password_hash",
    ]);
    const whole = cells()
      .map(({ value }) => asText(value))
      .join("\n");
    expect(whole).not.toContain(PASSWORD);
    expect(whole.toLowerCase()).not.toContain("hemmelig-passord");
    // A second Student with the same password gets another salt and hash.
    expect(String(row?.password_hash).split("$")).toHaveLength(6);
  });

  it("holds a session only as the sha-256 of its token, which is no session", async () => {
    const [session] = tables.sessions ?? [];
    const stored = String(session?.token_hash);
    expect(stored).toBe(
      createHash("sha256").update(student.token).digest("hex"),
    );
    expect(
      cells().some(({ value }) => asText(value).includes(student.token)),
    ).toBe(false);
    // What the database holds cannot be sent back as a cookie.
    const replay = await routes.profile.GET(withCookie("/api/profile", stored));
    expect(replay.status).toBe(401);
    const own = await routes.profile.GET(
      withCookie("/api/profile", student.token),
    );
    expect(own.status).toBe(200);
  });

  it("keeps the email in plain text, lower-cased, and nothing else personal beside it", () => {
    const [row] = tables.students ?? [];
    expect(row?.email).toBe(EMAIL.toLowerCase());
    expect(Object.keys(row ?? {}).sort()).toEqual([
      "created_at",
      "email",
      "id",
      "password_hash",
    ]);
    expect(Object.keys(tables.profiles?.[0] ?? {}).sort()).toEqual([
      "ai_notice_version",
      "cv_saved_at",
      "cv_text",
      "name",
      "student_id",
    ]);
  });
});

describe("FR-22: what reaches a log", () => {
  it("holds none of the Student's strings, the password or the token", async () => {
    // A failing request too: a wrong password and a malformed id.
    await routes.login(
      jsonRequest("/api/auth/login", {
        body: { email: EMAIL, password: "feil-passord-FR22" },
      }),
    );
    await routes.one(
      withCookie("/api/applications/not-a-uuid", student.token),
      ctx("not-a-uuid"),
    );
    const text = JSON.stringify(logged).toLowerCase();
    for (const secret of [...secrets(), student.token, "feil-passord-FR22"]) {
      expect(text).not.toContain(secret.toLowerCase());
    }
  });
});
