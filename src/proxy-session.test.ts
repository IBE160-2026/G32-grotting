import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";

const CODE = "a-long-random-code-1234";

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));

const { proxy } = await import("./proxy");

function request(path: string, sessionCookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: sessionCookie ? { cookie: `ja_sid=${sessionCookie}` } : {},
  });
}

beforeEach(() => {
  current = parseConfig({ FEATURE_ACCOUNTS: "true" });
});

describe("AD-12 proxy with accounts on", () => {
  it("answers an API route without ja_sid with 401 SESSION_EXPIRED", async () => {
    const response = proxy(request("/api/analyses"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "SESSION_EXPIRED", retryable: false },
    });
  });

  it("treats an empty ja_sid as none", () => {
    expect(proxy(request("/api/analyses", "")).status).toBe(401);
  });

  it("passes an API route with ja_sid, whatever it holds (the route checks it)", () => {
    expect(proxy(request("/api/analyses", "anything")).status).toBe(200);
  });

  it("passes register, login, logout and health without a cookie", () => {
    for (const path of [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/health",
    ]) {
      expect(proxy(request(path)).status).toBe(200);
    }
  });

  it("does not gate pages", () => {
    expect(proxy(request("/soknad")).status).toBe(200);
  });

  it("on Hosted passes the old gate and asks for the session instead", () => {
    current = parseConfig({
      APP_ENV: "hosted",
      ACCESS_CODE: CODE,
      DATABASE_URL: "pglite://memory",
      FEATURE_ACCOUNTS: "true",
    });
    expect(proxy(request("/soknad")).status).toBe(200);
    expect(proxy(request("/api/analyses")).status).toBe(401);
    expect(proxy(request("/api/auth/register")).status).toBe(200);
  });
});

describe("AD-12 proxy with accounts off", () => {
  it("does not look at ja_sid", () => {
    current = parseConfig({});
    expect(proxy(request("/api/analyses")).status).toBe(200);
    expect(proxy(request("/api/session")).status).toBe(200);
  });
});
