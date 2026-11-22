import { describe, expect, it } from "vitest";
import { sessionDecision } from "./session-gate";

const on = { accountsOn: true } as const;

describe("AD-12 sessionDecision", () => {
  it("answers 401 for an API path without a session cookie", () => {
    for (const path of [
      "/api/analyses",
      "/api/analyses/abc/letter",
      "/api/session",
      "/api/session/renew",
      "/api/cv/extract",
      "/api",
    ]) {
      expect(sessionDecision({ ...on, path, hasSessionCookie: false })).toBe(
        "api-401",
      );
    }
  });

  it("passes an API path with a session cookie", () => {
    expect(
      sessionDecision({ ...on, path: "/api/analyses", hasSessionCookie: true }),
    ).toBe("pass");
  });

  it("passes the public API paths without a cookie, also with a trailing slash", () => {
    for (const path of [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/health",
      "/api/access",
      "/api/auth/login/",
    ]) {
      expect(sessionDecision({ ...on, path, hasSessionCookie: false })).toBe(
        "pass",
      );
    }
  });

  it("does not make a neighbour of a public path public", () => {
    for (const path of [
      "/api/auth/login/x",
      "/api/auth",
      "/api/healthz",
      "/api/auth/loginx",
    ]) {
      expect(sessionDecision({ ...on, path, hasSessionCookie: false })).toBe(
        "api-401",
      );
    }
  });

  it("does not gate pages here", () => {
    for (const path of ["/", "/soknad", "/profil", "/tilgang"]) {
      expect(sessionDecision({ ...on, path, hasSessionCookie: false })).toBe(
        "pass",
      );
    }
  });

  it("changes nothing while accounts are off", () => {
    for (const path of ["/api/analyses", "/api/session", "/soknad"]) {
      expect(
        sessionDecision({ accountsOn: false, path, hasSessionCookie: false }),
      ).toBe("pass");
    }
  });
});
