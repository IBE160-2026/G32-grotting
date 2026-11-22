import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import type { Executor } from "./executor";
import { sessions, students } from "./schema";
import { createSession } from "./sessions";

// FR-18, UX-DR33: what a page learns about the visitor, and the redirect of a
// logged-out one to Logg inn. `next/headers` and `next/navigation` are mocked;
// the database is PGlite in memory.

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const BASE = {
  DATABASE_URL: "pglite://memory",
  ENCRYPTION_KEY: KEY,
  FEATURE_ACCOUNTS: "true",
};

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ja_sid" && cookie !== undefined
        ? { name, value: cookie }
        : undefined,
  }),
}));

class Redirected extends Error {
  constructor(readonly path: string) {
    super(`redirect:${path}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Redirected(path);
  },
}));

const { getPageSession, LOGIN_PATH, requireStudentPage } = await import(
  "./page-session"
);

let counter = 0;
async function newStudent(): Promise<string> {
  const db: Executor = await getDb();
  const [row] = await db
    .insert(students)
    .values({ email: `page${++counter}@example.test`, passwordHash: "x" })
    .returning({ id: students.id });
  return row?.id ?? "";
}

// A live session starts now; a dead one started an hour ago.
async function sessionToken(
  startedMinutesAgo = 0,
): Promise<{ token: string; studentId: string }> {
  const studentId = await newStudent();
  const started = new Date(Date.now() - startedMinutesAgo * 60_000);
  const { token } = await createSession(studentId, started, await getDb());
  return { token, studentId };
}

beforeEach(async () => {
  current = parseConfig(BASE);
  cookie = undefined;
  await (await getDb()).delete(sessions);
});

afterAll(closeDb);

describe("getPageSession", () => {
  it("is null with accounts off, even with a live cookie", async () => {
    const { token } = await sessionToken();
    cookie = token;
    current = parseConfig({ ...BASE, FEATURE_ACCOUNTS: "false" });
    expect(await getPageSession()).toBeNull();
  });

  it("is null without a cookie and with an empty one", async () => {
    expect(await getPageSession()).toBeNull();
    cookie = "";
    expect(await getPageSession()).toBeNull();
  });

  it("is null for an unknown token", async () => {
    cookie = "not-a-token-we-ever-issued";
    expect(await getPageSession()).toBeNull();
  });

  it("is null for an expired session, whose row is then deleted", async () => {
    const { token } = await sessionToken(60);
    cookie = token;
    expect(await getPageSession()).toBeNull();
    expect(await (await getDb()).select().from(sessions)).toHaveLength(0);
  });

  it("returns the Student of a live session, from the cookie alone", async () => {
    const { token, studentId } = await sessionToken();
    cookie = token;
    const found = await getPageSession();
    expect(found?.studentId).toBe(studentId);
  });
});

describe("requireStudentPage", () => {
  it("does nothing with accounts off, session or not", async () => {
    current = parseConfig({ ...BASE, FEATURE_ACCOUNTS: "false" });
    await expect(requireStudentPage()).resolves.toBeUndefined();
  });

  it("sends a visitor without a session to Logg inn", async () => {
    expect(LOGIN_PATH).toBe("/logg-inn");
    await expect(requireStudentPage()).rejects.toMatchObject({
      path: "/logg-inn",
    });
  });

  it("sends a visitor with a dead session to Logg inn", async () => {
    const { token } = await sessionToken(60);
    cookie = token;
    await expect(requireStudentPage()).rejects.toBeInstanceOf(Redirected);
  });

  it("lets a visitor with a live session through", async () => {
    const { token } = await sessionToken();
    cookie = token;
    await expect(requireStudentPage()).resolves.toBeUndefined();
  });
});
