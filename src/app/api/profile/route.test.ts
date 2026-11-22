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
import { CV_MAX } from "@/modules/cv/contracts";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";

// Story 6.3: GET and PUT /api/profile against PGlite, with the clock a
// parameter (only `Date` is faked, never timers).

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

const { POST: register } = await import("../auth/register/route");
const { POST: login } = await import("../auth/login/route");
const { GET, PUT } = await import("./route");

const MINUTE = 60_000;
const T0 = new Date("2026-11-22T10:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * MINUTE);

const CV =
  "Sertifisert regnskapsfører med erfaring fra Brønnøysund og Kongsberg. ".repeat(
    4,
  );
const OTHER_CV = "Prosjektleder for Aker-Solutions i Stavanger. ".repeat(6);

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

const get = (cookie?: string, path = "/api/profile") =>
  call(GET, path, { method: "GET", cookie });
const put = (
  cookie: string | undefined,
  body: unknown,
  path = "/api/profile",
) => call(PUT, path, { method: "PUT", cookie, body });

async function body(response: Response) {
  return (await response.json()) as {
    ok: boolean;
    data?: { name: string; cvText: string | null };
    error?: { code: string; field?: string; retryable: boolean };
  };
}

async function signUp(name: string, email: string) {
  const response = await call(register, "/api/auth/register", {
    body: { name, email, password: "12345678" },
  });
  expect(response.status).toBe(200);
  const studentId = ((await response.json()) as { data: { studentId: string } })
    .data.studentId;
  const signed = await call(login, "/api/auth/login", {
    body: { email, password: "12345678" },
  });
  expect(signed.status).toBe(200);
  const cookie = signed.headers.getSetCookie()[0] ?? "";
  return {
    studentId,
    token: cookie.split(";")[0]?.slice("ja_sid=".length) ?? "",
  };
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

describe("accounts off", () => {
  it("answers NOT_FOUND on GET and PUT", async () => {
    current = parseConfig({ ...LOCAL, FEATURE_ACCOUNTS: "false" });
    for (const response of [await get("x"), await put("x", { cvText: CV })]) {
      expect(response.status).toBe(404);
      expect((await body(response)).error?.code).toBe("NOT_FOUND");
    }
  });
});

describe("a session is needed", () => {
  it("answers 401 SESSION_EXPIRED without, with an unknown and with an expired cookie", async () => {
    const { token } = await signUp("Kari", "kari@example.test");
    vi.setSystemTime(at(31));
    for (const cookie of [undefined, "unknown-token", token]) {
      for (const response of [
        await get(cookie),
        await put(cookie, { cvText: CV }),
      ]) {
        expect(response.status).toBe(401);
        expect((await body(response)).error?.code).toBe("SESSION_EXPIRED");
      }
    }
  });

  it("writes nothing when the session is missing", async () => {
    const { token } = await signUp("Kari", "kari@example.test");
    await put(undefined, { cvText: CV });
    await put("unknown-token", { cvText: CV });
    expect((await body(await get(token))).data?.cvText).toBeNull();
  });
});

describe("GET /api/profile", () => {
  it("gives the name and no CV on a first visit", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    const response = await get(token);
    expect(response.status).toBe(200);
    expect(response.headers.has("X-Session-Expires-At")).toBe(true);
    expect((await body(response)).data).toEqual({
      name: "Kari Nordmann",
      cvText: null,
    });
  });
});

describe("PUT /api/profile", () => {
  it("stores the text and the next GET returns it", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    const saved = await put(token, { cvText: CV });
    expect(saved.status).toBe(200);
    expect((await body(saved)).data).toEqual({
      name: "Kari Nordmann",
      cvText: CV,
    });
    expect((await body(await get(token))).data).toEqual({
      name: "Kari Nordmann",
      cvText: CV,
    });
  });

  it("replaces the old text", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    await put(token, { cvText: CV });
    await put(token, { cvText: OTHER_CV });
    expect((await body(await get(token))).data?.cvText).toBe(OTHER_CV);
  });

  it("stores it encrypted: a raw select shows neither the name nor the text", async () => {
    const { token } = await signUp("Ingrid Solbakken", "ingrid@example.test");
    await put(token, { cvText: CV });
    const dump = JSON.stringify(
      await (await getDb()).execute(sql`select * from profiles`),
    );
    expect(dump).toContain("v1.");
    for (const word of [
      "Ingrid",
      "Solbakken",
      "regnskapsfører",
      "Kongsberg",
      "Sertifisert",
    ]) {
      expect(dump).not.toContain(word);
    }
  });

  it("answers a field error for a text under 200 trimmed characters and keeps the old text", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    await put(token, { cvText: CV });
    for (const cvText of [
      "",
      "kort",
      `  ${"a".repeat(150)}  ${" ".repeat(80)}`,
    ]) {
      const response = await put(token, { cvText });
      expect(response.status).toBe(400);
      expect((await body(response)).error).toEqual({
        code: "INVALID_INPUT",
        field: "cvText",
        retryable: false,
      });
    }
    expect((await body(await get(token))).data?.cvText).toBe(CV);
  });

  it("answers a field error for a text over 20 000 characters and keeps the old text", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    await put(token, { cvText: CV });
    const response = await put(token, { cvText: "a".repeat(CV_MAX + 1) });
    expect(response.status).toBe(400);
    expect((await body(response)).error?.field).toBe("cvText");
    expect((await body(await get(token))).data?.cvText).toBe(CV);
    // The limit itself is allowed.
    expect((await put(token, { cvText: "a".repeat(CV_MAX) })).status).toBe(200);
  });

  it("answers a field error for a body without a text or not JSON", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    const missing = await put(token, {});
    expect(missing.status).toBe(400);
    expect((await body(missing)).error?.field).toBe("cvText");
    const wrongType = await put(token, { cvText: 12 });
    expect(wrongType.status).toBe(400);
    const raw = await PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { cookie: `ja_sid=${token}` },
        body: "nope",
      }),
    );
    expect(raw.status).toBe(400);
  });

  it("ignores a name in the body", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    const response = await put(token, { cvText: CV, name: "Noen Andre" });
    expect(response.status).toBe(200);
    expect((await body(response)).data?.name).toBe("Kari Nordmann");
    expect((await body(await get(token))).data?.name).toBe("Kari Nordmann");
  });
});

describe("FR-19 one Student cannot reach another's Profile", () => {
  it("gives each session its own view", async () => {
    const a = await signUp("Anna Aas", "anna@example.test");
    const b = await signUp("Bjørn Berg", "bjorn@example.test");
    await put(a.token, { cvText: CV });
    const view = await body(await get(b.token));
    expect(view.data).toEqual({ name: "Bjørn Berg", cvText: null });
    expect(JSON.stringify(view)).not.toContain("Anna");
  });

  it("lets B's PUT touch only B's row, whatever ids the request carries", async () => {
    const a = await signUp("Anna Aas", "anna@example.test");
    const b = await signUp("Bjørn Berg", "bjorn@example.test");
    await put(a.token, { cvText: CV });
    const response = await put(
      b.token,
      { cvText: OTHER_CV, studentId: a.studentId, student_id: a.studentId },
      `/api/profile?studentId=${a.studentId}`,
    );
    expect(response.status).toBe(200);
    expect((await body(response)).data).toEqual({
      name: "Bjørn Berg",
      cvText: OTHER_CV,
    });
    expect((await body(await get(a.token))).data?.cvText).toBe(CV);
    // A GET with A's id in the query still answers B's own view.
    const read = await get(b.token, `/api/profile?studentId=${a.studentId}`);
    expect((await body(read)).data?.name).toBe("Bjørn Berg");
  });
});

describe("a Profile row that is missing", () => {
  it("answers 401 on GET and PUT, not a half view", async () => {
    const { token } = await signUp("Kari Nordmann", "kari@example.test");
    await (await getDb()).execute(sql`delete from profiles`);
    expect((await get(token)).status).toBe(401);
    expect((await put(token, { cvText: CV })).status).toBe(401);
  });
});

describe("what reaches a log", () => {
  it("never holds the CV text or the name, also after a failure", async () => {
    const { token } = await signUp("Ingrid Solbakken", "ingrid@example.test");
    await put(token, { cvText: CV });
    await put(token, { cvText: "kort Brønnøysund" });
    await get(undefined);
    expect(errors).toHaveBeenCalled();
    const logged = JSON.stringify(errors.mock.calls);
    for (const word of [
      "regnskapsfører",
      "Brønnøysund",
      "Ingrid",
      "Solbakken",
    ]) {
      expect(logged).not.toContain(word);
    }
  });
});
