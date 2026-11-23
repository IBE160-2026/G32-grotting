import { sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";

// Story 6.6: POST /api/profile/ai-notice against PGlite, the clock faked.

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const LOCAL = {
  DATABASE_URL: "pglite://memory",
  ENCRYPTION_KEY: KEY,
  FEATURE_ACCOUNTS: "true",
};

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));

const { POST: register } = await import("../../auth/register/route");
const { POST: login } = await import("../../auth/login/route");
const { GET } = await import("../route");
const { POST } = await import("./route");

const MINUTE = 60_000;
const T0 = new Date("2026-11-23T10:00:00.000Z");

type Handler = (request: Request) => Promise<Response>;

function call(
  handler: Handler,
  path: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: options.method ?? "POST",
      headers: options.cookie ? { cookie: `ja_sid=${options.cookie}` } : {},
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  );
}

type Envelope = {
  ok: boolean;
  data?: { noticeVersion?: string; aiNoticeVersion?: string | null };
  error?: { code: string; field?: string };
};

async function signUp(name: string, email: string) {
  const response = await call(register, "/api/auth/register", {
    body: { name, email, password: "12345678" },
  });
  expect(response.status).toBe(200);
  const signed = await call(login, "/api/auth/login", {
    body: { email, password: "12345678" },
  });
  const cookie = signed.headers.getSetCookie()[0] ?? "";
  return cookie.split(";")[0]?.slice("ja_sid=".length) ?? "";
}

const accept = (cookie: string | undefined, body: unknown) =>
  call(POST, "/api/profile/ai-notice", { cookie, body });
const stored = async (cookie: string) =>
  (
    (await (
      await call(GET, "/api/profile", { method: "GET", cookie })
    ).json()) as Envelope
  ).data?.aiNoticeVersion;

let errors: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  current = parseConfig(LOCAL);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  await (await getDb()).execute(sql`delete from students`);
});

afterEach(() => {
  vi.useRealTimers();
  errors.mockRestore();
});

afterAll(closeDb);

describe("POST /api/profile/ai-notice", () => {
  it("stores the current version on the Profile and answers it", async () => {
    const token = await signUp("Kari Nordmann", "kari@example.test");
    expect(await stored(token)).toBeNull();
    const version = current.aiNotice.version;
    const response = await accept(token, { noticeVersion: version });
    expect(response.status).toBe(200);
    expect(response.headers.has("X-Session-Expires-At")).toBe(true);
    expect(((await response.json()) as Envelope).data).toEqual({
      noticeVersion: version,
    });
    expect(await stored(token)).toBe(version);
  });

  it("refuses another version and stores nothing", async () => {
    const token = await signUp("Kari Nordmann", "kari@example.test");
    const response = await accept(token, { noticeVersion: "notice-1:old" });
    expect(response.status).toBe(400);
    expect(((await response.json()) as Envelope).error).toMatchObject({
      code: "INVALID_INPUT",
      field: "noticeVersion",
    });
    expect(await stored(token)).toBeNull();
  });

  it("refuses a bad body with the same field error", async () => {
    const token = await signUp("Kari Nordmann", "kari@example.test");
    for (const body of [{}, { noticeVersion: 3 }, { noticeVersion: null }]) {
      const response = await accept(token, body);
      expect(response.status).toBe(400);
      expect(((await response.json()) as Envelope).error?.field).toBe(
        "noticeVersion",
      );
    }
    const raw = await POST(
      new Request("http://localhost/api/profile/ai-notice", {
        method: "POST",
        headers: { cookie: `ja_sid=${token}` },
        body: "nope",
      }),
    );
    expect(raw.status).toBe(400);
    expect(await stored(token)).toBeNull();
  });

  it("answers SESSION_EXPIRED without a session, with an unknown and with an expired one", async () => {
    const token = await signUp("Kari Nordmann", "kari@example.test");
    const body = { noticeVersion: current.aiNotice.version };
    vi.setSystemTime(new Date(T0.getTime() + 31 * MINUTE));
    for (const cookie of [undefined, "unknown-token", token]) {
      const response = await accept(cookie, body);
      expect(response.status).toBe(401);
      expect(((await response.json()) as Envelope).error?.code).toBe(
        "SESSION_EXPIRED",
      );
    }
    const rows = await (await getDb()).execute(
      sql`select count(*)::int as n from profiles where ai_notice_version is not null`,
    );
    const list = (
      Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows
    ) as {
      n: number;
    }[];
    expect(list[0]?.n).toBe(0);
  });

  it("answers NOT_FOUND while accounts are off", async () => {
    current = parseConfig({ ...LOCAL, FEATURE_ACCOUNTS: "false" });
    const response = await accept("x", { noticeVersion: "v" });
    expect(response.status).toBe(404);
    expect(((await response.json()) as Envelope).error?.code).toBe("NOT_FOUND");
  });

  it("stores for the session's Student only, whatever the body names", async () => {
    const a = await signUp("Anna Aas", "anna@example.test");
    const b = await signUp("Bjørn Berg", "bjorn@example.test");
    const response = await accept(b, {
      noticeVersion: current.aiNotice.version,
      studentId: "00000000-0000-4000-8000-000000000000",
    });
    expect(response.status).toBe(200);
    expect(await stored(b)).toBe(current.aiNotice.version);
    expect(await stored(a)).toBeNull();
  });

  it("answers 401 when the Profile row is missing", async () => {
    const token = await signUp("Kari Nordmann", "kari@example.test");
    await (await getDb()).execute(sql`delete from profiles`);
    const response = await accept(token, {
      noticeVersion: current.aiNotice.version,
    });
    expect(response.status).toBe(401);
  });
});
