import { describe, expect, it } from "vitest";
import { gateDecision, gateIsActive } from "./gate";

const hosted = { hosted: true, accountsOn: false, cookieValid: false };

describe("FR-31 gateDecision", () => {
  it("passes everything locally", () => {
    for (const path of ["/", "/soknad", "/api/x", "/tilgang"]) {
      expect(
        gateDecision({
          hosted: false,
          accountsOn: false,
          path,
          cookieValid: false,
        }),
      ).toBe("pass");
    }
  });

  it("passes everything when accounts are on", () => {
    expect(gateDecision({ ...hosted, accountsOn: true, path: "/soknad" })).toBe(
      "pass",
    );
  });

  it("passes the exempt paths on Hosted without a cookie", () => {
    for (const path of [
      "/tilgang",
      "/api/access",
      "/api/health",
      "/_next/static/chunks/a.js",
      "/_next/image",
      "/favicon.ico",
    ]) {
      expect(gateDecision({ ...hosted, path })).toBe("pass");
    }
  });

  it("passes any path with a valid cookie", () => {
    expect(
      gateDecision({ ...hosted, path: "/soknad", cookieValid: true }),
    ).toBe("pass");
    expect(gateDecision({ ...hosted, path: "/api/x", cookieValid: true })).toBe(
      "pass",
    );
  });

  it("redirects a page without a cookie to /tilgang", () => {
    expect(gateDecision({ ...hosted, path: "/" })).toBe("redirect-to-gate");
    expect(gateDecision({ ...hosted, path: "/soknad" })).toBe(
      "redirect-to-gate",
    );
  });

  it("answers an /api path without a cookie with 401", () => {
    expect(gateDecision({ ...hosted, path: "/api/analyses" })).toBe("api-401");
    expect(gateDecision({ ...hosted, path: "/api" })).toBe("api-401");
  });

  it("does not exempt look-alike paths", () => {
    expect(gateDecision({ ...hosted, path: "/tilgang/x" })).toBe(
      "redirect-to-gate",
    );
    expect(gateDecision({ ...hosted, path: "/api/health/x" })).toBe("api-401");
    expect(gateDecision({ ...hosted, path: "/apix" })).toBe("redirect-to-gate");
    expect(gateDecision({ ...hosted, path: "/_next/data/x.json" })).toBe(
      "redirect-to-gate",
    );
    expect(gateDecision({ ...hosted, path: "/favicon.icoX" })).toBe(
      "redirect-to-gate",
    );
  });

  it("is active only on Hosted with accounts off", () => {
    expect(gateIsActive({ hosted: true, accountsOn: false })).toBe(true);
    expect(gateIsActive({ hosted: true, accountsOn: true })).toBe(false);
    expect(gateIsActive({ hosted: false, accountsOn: false })).toBe(false);
  });
});
