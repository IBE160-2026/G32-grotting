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

// FR-18, FR-19, FR-22, FR-31: the five account routes against PGlite, with the
// clock a parameter (only `Date` is faked, never timers).

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const CODE = "a-long-random-code-1234";
const BASE = {
  DATABASE_URL: "pglite://memory",
  ENCRYPTION_KEY: KEY,
  FEATURE_ACCOUNTS: "true",
};
const LOCAL = BASE;
const HOSTED = { ...BASE, APP_ENV: "hosted", ACCESS_CODE: CODE };

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));

const { POST: register } = await import("./register/route");
const { POST: login } = await import("./login/route");
const { POST: logout } = await import("./logout/route");
const { GET: getSession } = await import("../session/route");
const { POST: renew } = await import("../session/renew/route");

const EXPIRES = "X-Session-Expires-At";
const MINUTE = 60_000;
const T0 = new Date("2026-11-22T10:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * MINUTE);

type Handler = (request: Request) => Promise<Response>;

function call(
  handler: Handler,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
    raw?: string;
  } = {},
) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: options.method ?? "POST",
      headers: options.cookie ? { cookie: `ja_sid=${options.cookie}` } : {},
      body:
        options.raw ??
        (options.body === undefined ? undefined : JSON.stringify(options.body)),
    }),
  );
}

function tokenOf(response: Response): string {
  const cookie = response.headers.getSetCookie()[0] ?? "";
  return cookie.split(";")[0]?.slice("ja_sid=".length) ?? "";
}

async function body(response: Response) {
  return (await response.json()) as {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; field?: string; retryable: boolean };
  };
}

async function signUp(name: string, email: string, password: string) {
  const response = await call(register, "/api/auth/register", {
    body: { name, email, password },
  });
  expect(response.status).toBe(200);
  return (await body(response)).data?.studentId as string;
}

async function signIn(email: string, password: string) {
  const response = await call(login, "/api/auth/login", {
    body: { email, password },
  });
  expect(response.status).toBe(200);
  return { token: tokenOf(response), view: (await body(response)).data };
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

async function sessionCount() {
  const result = await (await getDb()).execute(
    sql`select count(*)::int as n from sessions`,
  );
  return rowsOf(result)[0]?.n;
}

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

describe("accounts off: the app is as after Epic 5", () => {
  it("answers NOT_FOUND on every new route and touches nothing", async () => {
    current = parseConfig({ ...LOCAL, FEATURE_ACCOUNTS: "false" });
    const results = await Promise.all([
      call(register, "/api/auth/register", {
        body: { name: "A", email: "a@example.test", password: "12345678" },
      }),
      call(login, "/api/auth/login", {
        body: { email: "a@example.test", password: "12345678" },
      }),
      call(logout, "/api/auth/logout"),
      call(getSession, "/api/session", { method: "GET", cookie: "x" }),
      call(renew, "/api/session/renew", { cookie: "x" }),
    ]);
    for (const response of results) {
      expect(response.status).toBe(404);
      expect((await body(response)).error?.code).toBe("NOT_FOUND");
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    const rows = await (await getDb()).execute(
      sql`select count(*)::int as n from students`,
    );
    expect(rowsOf(rows)[0]?.n).toBe(0);
  });
});

describe("FR-18 register", () => {
  it("answers { studentId } and starts no session", async () => {
    const response = await call(register, "/api/auth/register", {
      body: { name: "Kari", email: "Kari@Example.test", password: "12345678" },
    });
    expect(response.status).toBe(200);
    const result = await body(response);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.data ?? {})).toEqual(["studentId"]);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await sessionCount()).toBe(0);
  });

  it("gives a field error for a short password, a taken email and a body that is not JSON", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const short = await call(register, "/api/auth/register", {
      body: { name: "B", email: "b@example.test", password: "1234567" },
    });
    expect(short.status).toBe(400);
    expect((await body(short)).error).toEqual({
      code: "INVALID_INPUT",
      field: "password",
      retryable: false,
    });
    const taken = await call(register, "/api/auth/register", {
      body: { name: "K2", email: "KARI@example.test", password: "12345678" },
    });
    expect(taken.status).toBe(400);
    expect((await body(taken)).error?.field).toBe("email");
    const junk = await call(register, "/api/auth/register", { raw: "nope" });
    expect(junk.status).toBe(400);
  });
});

describe("FR-18 login", () => {
  it("sets ja_sid: httpOnly, SameSite=Lax, no Max-Age, not Secure locally", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const response = await call(login, "/api/auth/login", {
      body: { email: "kari@example.test", password: "12345678" },
    });
    expect(response.status).toBe(200);
    const [cookie] = response.headers.getSetCookie();
    expect(cookie).toMatch(/^ja_sid=[A-Za-z0-9_-]{43}; /);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Max-Age");
    expect(cookie).not.toContain("Expires");
    expect(cookie).not.toContain("Secure");
    expect(response.headers.get(EXPIRES)).toBe(at(30).toISOString());
    expect((await body(response)).data).toMatchObject({
      name: "Kari",
      email: "kari@example.test",
      noticeVersion: null,
      expiresAt: at(30).toISOString(),
    });
  });

  it("gives one answer for an unknown email and a wrong password, with no cookie and no row", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const wrong = await call(login, "/api/auth/login", {
      body: { email: "kari@example.test", password: "87654321" },
    });
    const unknown = await call(login, "/api/auth/login", {
      body: { email: "nobody@example.test", password: "87654321" },
    });
    expect(wrong.status).toBe(400);
    expect(await wrong.text()).toBe(await unknown.text());
    for (const response of [wrong, unknown]) {
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    expect(await sessionCount()).toBe(0);
  });

  it("never lets the password or the token reach a log", async () => {
    await signUp("Kari", "kari@example.test", "hemmelig-passord");
    await call(login, "/api/auth/login", {
      body: { email: "kari@example.test", password: "feil-passord-123" },
    });
    const { token } = await signIn("kari@example.test", "hemmelig-passord");
    await call(getSession, "/api/session", { method: "GET", cookie: token });
    const logged = JSON.stringify(errors.mock.calls);
    for (const secret of ["hemmelig-passord", "feil-passord-123", token]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe("AD-12 Student routes and the session", () => {
  it("answers 401 SESSION_EXPIRED without a cookie, with an unknown one and with an empty one", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    for (const cookie of [undefined, "unknown-token", ""]) {
      const response = await call(getSession, "/api/session", {
        method: "GET",
        cookie,
      });
      expect(response.status).toBe(401);
      expect((await body(response)).error?.code).toBe("SESSION_EXPIRED");
      expect(response.headers.has(EXPIRES)).toBe(false);
    }
  });

  it("returns the SessionView and the expiry header", async () => {
    const studentId = await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    const response = await call(getSession, "/api/session", {
      method: "GET",
      cookie: token,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get(EXPIRES)).toBe(at(30).toISOString());
    expect((await body(response)).data).toEqual({
      studentId,
      name: "Kari",
      email: "kari@example.test",
      noticeVersion: null,
      expiresAt: at(30).toISOString(),
    });
  });

  it("extends the session only when the last extension is 5 minutes old, and ends it after 30 idle", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    const expiry = async (minutes: number) => {
      vi.setSystemTime(at(minutes));
      const response = await call(getSession, "/api/session", {
        method: "GET",
        cookie: token,
      });
      return response.status === 200
        ? response.headers.get(EXPIRES)
        : response.status;
    };
    expect(await expiry(4)).toBe(at(30).toISOString());
    expect(await expiry(6)).toBe(at(36).toISOString());
    expect(await expiry(10)).toBe(at(36).toISOString());
    expect(await expiry(11)).toBe(at(41).toISOString());
    // Idle for 30 minutes from the last extension (minute 11).
    expect(await expiry(41)).toBe(401);
    expect(await sessionCount()).toBe(0);
    expect(await expiry(42)).toBe(401);
  });

  it("renew always extends: header and body carry the new end", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    vi.setSystemTime(at(1));
    const response = await call(renew, "/api/session/renew", { cookie: token });
    expect(response.status).toBe(200);
    expect(response.headers.get(EXPIRES)).toBe(at(31).toISOString());
    expect((await body(response)).data?.expiresAt).toBe(at(31).toISOString());
    // The renewal counts as activity: still alive at minute 30, gone after.
    vi.setSystemTime(at(30));
    const alive = await call(getSession, "/api/session", {
      method: "GET",
      cookie: token,
    });
    expect(alive.status).toBe(200);
  });

  it("renew needs a live session", async () => {
    const response = await call(renew, "/api/session/renew", { cookie: "x" });
    expect(response.status).toBe(401);
    expect((await body(response)).error?.code).toBe("SESSION_EXPIRED");
  });
});

describe("FR-18 logout", () => {
  it("deletes the row, clears the cookie and ends the session", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    expect(await sessionCount()).toBe(1);
    const response = await call(logout, "/api/auth/logout", { cookie: token });
    expect(response.status).toBe(200);
    expect((await body(response)).data).toEqual({ loggedOut: true });
    const [cleared] = response.headers.getSetCookie();
    expect(cleared).toMatch(/^ja_sid=; /);
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("HttpOnly");
    expect(await sessionCount()).toBe(0);
    const after = await call(getSession, "/api/session", {
      method: "GET",
      cookie: token,
    });
    expect(after.status).toBe(401);
  });

  it("works without a valid session: none, unknown, or expired", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    for (const cookie of [undefined, "unknown", "a".repeat(5000)]) {
      const response = await call(logout, "/api/auth/logout", { cookie });
      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie()[0]).toContain("Max-Age=0");
    }
    expect(await sessionCount()).toBe(1);
    vi.setSystemTime(at(45));
    expect(
      (await call(logout, "/api/auth/logout", { cookie: token })).status,
    ).toBe(200);
    expect(await sessionCount()).toBe(0);
  });
});

describe("FR-19 one Student cannot reach another's", () => {
  it("keeps each session to its own Student", async () => {
    const a = await signUp("Anna Aas", "anna@example.test", "12345678");
    const b = await signUp("Bjørn Berg", "bjorn@example.test", "12345678");
    const sa = await signIn("anna@example.test", "12345678");
    const sb = await signIn("bjorn@example.test", "12345678");

    const viewA = await body(
      await call(getSession, "/api/session", {
        method: "GET",
        cookie: sa.token,
      }),
    );
    const viewB = await body(
      await call(getSession, "/api/session", {
        method: "GET",
        cookie: sb.token,
      }),
    );
    expect(viewA.data).toMatchObject({ studentId: a, name: "Anna Aas" });
    expect(viewB.data).toMatchObject({ studentId: b, name: "Bjørn Berg" });
    expect(JSON.stringify(viewB)).not.toContain("Anna");
    expect(JSON.stringify(viewB)).not.toContain(a);
  });

  it("lets B's renew and logout reach only B's session", async () => {
    await signUp("Anna Aas", "anna@example.test", "12345678");
    await signUp("Bjørn Berg", "bjorn@example.test", "12345678");
    const sa = await signIn("anna@example.test", "12345678");
    const sb = await signIn("bjorn@example.test", "12345678");

    vi.setSystemTime(at(4));
    const renewed = await call(renew, "/api/session/renew", {
      cookie: sb.token,
    });
    expect(renewed.headers.get(EXPIRES)).toBe(at(34).toISOString());
    await call(logout, "/api/auth/logout", { cookie: sb.token });

    expect(await sessionCount()).toBe(1);
    // A's session was not touched by B's renew: it still ends 30 minutes after
    // A's login.
    const aView = await call(getSession, "/api/session", {
      method: "GET",
      cookie: sa.token,
    });
    expect(aView.status).toBe(200);
    expect(aView.headers.get(EXPIRES)).toBe(at(30).toISOString());
    vi.setSystemTime(at(30));
    expect(
      (
        await call(getSession, "/api/session", {
          method: "GET",
          cookie: sa.token,
        })
      ).status,
    ).toBe(401);
  });

  it("lets a token made up from another Student's id open nothing", async () => {
    const a = await signUp("Anna Aas", "anna@example.test", "12345678");
    await signIn("anna@example.test", "12345678");
    for (const cookie of [a, Buffer.from(a).toString("base64url")]) {
      const response = await call(getSession, "/api/session", {
        method: "GET",
        cookie,
      });
      expect(response.status).toBe(401);
    }
  });
});

describe("FR-22 raw rows hold no password, token or name in plain text", () => {
  it("shows nothing readable in a select on students, sessions and profiles", async () => {
    const password = "hemmelig-passord-9";
    const studentId = await signUp(
      "Kari Nordmann-Hansen",
      "Kari.Hansen@Example.test",
      password,
    );
    const { token } = await signIn("kari.hansen@example.test", password);
    const db = await getDb();
    const dump = JSON.stringify(
      await Promise.all([
        db.execute(sql`select * from students`),
        db.execute(sql`select * from sessions`),
        db.execute(sql`select * from profiles`),
      ]),
    );
    expect(dump).toContain(studentId);
    expect(dump).toContain("kari.hansen@example.test");
    expect(dump).toContain("scrypt$16384$8$1$");
    expect(dump).toContain("v1.");
    for (const secret of [
      password,
      token,
      "Kari",
      "Nordmann",
      "Hansen-",
      "Kari Nordmann-Hansen",
      Buffer.from("Kari Nordmann-Hansen").toString("base64"),
    ]) {
      expect(dump).not.toContain(secret);
    }
    // Hansen appears only inside the lower-cased email.
    expect(dump.replace("kari.hansen@example.test", "")).not.toContain(
      "Hansen",
    );
  });
});

describe("FR-31 registration on Hosted", () => {
  beforeEach(() => {
    current = parseConfig(HOSTED);
  });

  it("requires the Access code and writes nothing without it", async () => {
    for (const accessCode of [undefined, "", "wrong-code-wrong-code"]) {
      const response = await call(register, "/api/auth/register", {
        body: {
          name: "Kari",
          email: "kari@example.test",
          password: "12345678",
          accessCode,
        },
      });
      expect(response.status).toBe(400);
      expect((await body(response)).error).toEqual({
        code: "INVALID_INPUT",
        field: "accessCode",
        retryable: false,
      });
    }
    const rows = await (await getDb()).execute(
      sql`select count(*)::int as n from students`,
    );
    expect(rowsOf(rows)[0]?.n).toBe(0);
  });

  it("registers with the code, and the session cookie is Secure", async () => {
    const response = await call(register, "/api/auth/register", {
      body: {
        name: "Kari",
        email: "kari@example.test",
        password: "12345678",
        accessCode: CODE,
      },
    });
    expect(response.status).toBe(200);
    const signed = await call(login, "/api/auth/login", {
      body: { email: "kari@example.test", password: "12345678" },
    });
    expect(signed.status).toBe(200);
    expect(signed.headers.getSetCookie()[0]).toContain("; Secure");
    const out = await call(logout, "/api/auth/logout");
    expect(out.headers.getSetCookie()[0]).toContain("; Secure");
  });

  it("asks for no code at login", async () => {
    await call(register, "/api/auth/register", {
      body: {
        name: "Kari",
        email: "kari@example.test",
        password: "12345678",
        accessCode: CODE,
      },
    });
    const { token } = await signIn("kari@example.test", "12345678");
    expect(token).not.toBe("");
  });
});

describe("AD-12 a Student whose Profile row is missing", () => {
  it("answers 401 on the session routes and not a half view", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    const { token } = await signIn("kari@example.test", "12345678");
    await (await getDb()).execute(sql`delete from profiles`);
    const view = await call(getSession, "/api/session", {
      method: "GET",
      cookie: token,
    });
    expect(view.status).toBe(401);
    expect((await body(view)).error?.code).toBe("SESSION_EXPIRED");
    const renewed = await call(renew, "/api/session/renew", { cookie: token });
    expect(renewed.status).toBe(401);
  });

  it("leaves no session row behind when the login cannot build its view", async () => {
    await signUp("Kari", "kari@example.test", "12345678");
    await (await getDb()).execute(sql`delete from profiles`);
    const response = await call(login, "/api/auth/login", {
      body: { email: "kari@example.test", password: "12345678" },
    });
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await sessionCount()).toBe(0);
  });
});

describe("AD-12 input bounds", () => {
  it("refuses an over-long password or email at login before any hashing", async () => {
    for (const bad of [
      { email: "kari@example.test", password: "x".repeat(1001) },
      { email: `${"a".repeat(250)}@example.test`, password: "12345678" },
    ]) {
      const response = await call(login, "/api/auth/login", { body: bad });
      expect(response.status).toBe(400);
    }
  });

  it("answers an over-long email at registration with a field error", async () => {
    const response = await call(register, "/api/auth/register", {
      body: {
        name: "Kari",
        email: `${"a".repeat(250)}@example.test`,
        password: "12345678",
      },
    });
    expect(response.status).toBe(400);
    expect((await body(response)).error?.field).toBe("email");
  });
});
