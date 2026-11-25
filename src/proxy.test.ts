import { NextRequest } from "next/server";
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
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));

const { proxy, config } = await import("./proxy");

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie: `ja_access=${cookie}` } : {},
  });
}

beforeEach(() => {
  current = parseConfig(HOSTED);
});

describe("FR-31 proxy", () => {
  it("redirects a page without the cookie to /tilgang", () => {
    const response = proxy(request("/soknad"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/tilgang",
    );
  });

  it("answers an API route without the cookie with 401 ACCESS_REQUIRED", async () => {
    const response = proxy(request("/api/analyses"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "ACCESS_REQUIRED", retryable: false },
    });
  });

  it("passes the exempt paths and a valid cookie", () => {
    for (const path of ["/tilgang", "/api/access", "/api/health"]) {
      expect(proxy(request(path)).headers.get("location")).toBeNull();
      expect(proxy(request(path)).status).toBe(200);
    }
    expect(proxy(request("/soknad", accessCookieValue(CODE))).status).toBe(200);
  });

  it("treats a tampered cookie as no cookie", () => {
    expect(proxy(request("/soknad", "abc")).status).toBe(307);
    expect(
      proxy(request("/soknad", `${accessCookieValue(CODE)}0`)).status,
    ).toBe(307);
  });

  it("never applies locally", () => {
    // Accounts are on by default since Story 6.12 (and then the session check
    // answers 401 on API routes), so the flag is set off for the old gate.
    current = parseConfig({ FEATURE_ACCOUNTS: "false" });
    expect(proxy(request("/soknad")).status).toBe(200);
    expect(proxy(request("/api/analyses")).status).toBe(200);
  });

  it("leaves static assets out of its matcher", () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test("/_next/static/a.js")).toBe(false);
    expect(pattern.test("/_next/image")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
    expect(pattern.test("/favicon.icoX")).toBe(true);
    expect(pattern.test("/faviconXico")).toBe(true);
    expect(pattern.test("/_next/staticx")).toBe(true);
    expect(pattern.test("/soknad")).toBe(true);
  });
});
