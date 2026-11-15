import { beforeEach, describe, expect, it, vi } from "vitest";
import { accessCookieValue } from "@/modules/identity";
import { type Config, parseConfig } from "@/shared/server/config";

const CODE = "a-long-random-code-1234";
const HOSTED = {
  APP_ENV: "hosted",
  ACCESS_CODE: CODE,
  DATABASE_URL: "pglite://memory",
};

let current: Config;
const set = vi.fn();

vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));

const { POST } = await import("./route");

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/access", {
      method: "POST",
      body: raw ? String(body) : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  set.mockClear();
  current = parseConfig(HOSTED);
});

describe("FR-31 POST /api/access", () => {
  it("sets the session cookie on the correct code", async () => {
    const response = await post({ code: CODE });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { opened: true } });
    expect(set).toHaveBeenCalledWith("ja_access", accessCookieValue(CODE), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  });

  it("sets no Max-Age or expiry", async () => {
    await post({ code: CODE });
    const options = set.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(options).not.toHaveProperty("maxAge");
    expect(options).not.toHaveProperty("expires");
  });

  it("answers a wrong code with INVALID_INPUT on the field code", async () => {
    const response = await post({ code: "a-long-random-code-1235" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "INVALID_INPUT", field: "code", retryable: false },
    });
    expect(set).not.toHaveBeenCalled();
  });

  it("answers a missing field or a body that is not JSON with INVALID_INPUT", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post("not json", true)).status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  it("does not exist locally or when accounts are on", async () => {
    current = parseConfig({});
    expect((await post({ code: CODE })).status).toBe(404);
    current = parseConfig({ ...HOSTED, FEATURE_ACCOUNTS: "true" });
    expect((await post({ code: CODE })).status).toBe(404);
    expect(set).not.toHaveBeenCalled();
  });
});
