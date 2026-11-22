import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";

// Story 6.3: with accounts on, the extract route needs a live session; with
// them off it is the plain route (route.test.ts covers that, unedited).

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
const { POST } = await import("./route");

function post(cookie?: string) {
  const body = new FormData();
  body.set("file", new File(["Hei, dette er en CV.\r\nLinje to."], "cv.txt"));
  return POST(
    new Request("http://localhost/api/cv/extract", {
      method: "POST",
      body,
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
  );
}

async function token(): Promise<string> {
  await register(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Kari",
        email: "kari@example.test",
        password: "12345678",
      }),
    }),
  );
  const signed = await login(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "kari@example.test",
        password: "12345678",
      }),
    }),
  );
  const cookie = signed.headers.getSetCookie()[0] ?? "";
  return cookie.split(";")[0]?.slice("ja_sid=".length) ?? "";
}

beforeEach(async () => {
  current = parseConfig(LOCAL);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

describe("POST /api/cv/extract with accounts on", () => {
  it("answers 401 SESSION_EXPIRED without a session or with an unknown one", async () => {
    for (const cookie of [undefined, "unknown-token"]) {
      const response = await post(cookie);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        ok: false,
        error: { code: "SESSION_EXPIRED", retryable: false },
      });
    }
  });

  it("extracts the file for a Student with a session", async () => {
    const response = await post(await token());
    expect(response.status).toBe(200);
    expect(response.headers.has("X-Session-Expires-At")).toBe(true);
    expect(await response.json()).toEqual({
      ok: true,
      data: { text: "Hei, dette er en CV.\nLinje to.", noText: false },
    });
  });

  it("is the plain route again with accounts off", async () => {
    current = parseConfig({ ...LOCAL, FEATURE_ACCOUNTS: "false" });
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.headers.has("X-Session-Expires-At")).toBe(false);
  });
});

// A file of the wrong type is still refused with 400 once the session is
// accepted.
describe("a wrong file with a session", () => {
  it("is judged as before", async () => {
    const cookie = await token();
    const body = new FormData();
    body.set(
      "file",
      new File(
        [
          new Uint8Array(
            readFileSync(
              fileURLToPath(
                new URL("../../../../../e2e/files/cv.docx", import.meta.url),
              ),
            ),
          ),
        ],
        "cv.docx",
      ),
    );
    const response = await POST(
      new Request("http://localhost/api/cv/extract", {
        method: "POST",
        body,
        headers: { cookie: `ja_sid=${cookie}` },
      }),
    );
    expect(response.status).toBe(400);
  });
});
