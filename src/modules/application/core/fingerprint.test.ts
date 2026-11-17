import { describe, expect, it } from "vitest";
import type { AnalysisInputs } from "../contracts";
import { fingerprintOf } from "./fingerprint";

const inputs: AnalysisInputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Junior frontendutvikler",
  employer: "Nordic Digital",
};
const version = "v1-0123abcd";

describe("AD-6 fingerprintOf", () => {
  it("is a hex sha256 and stable", () => {
    const fingerprint = fingerprintOf(inputs, version, "code");
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintOf({ ...inputs }, version, "code")).toBe(fingerprint);
  });

  it("differs when any one input differs, even the job title", () => {
    const base = fingerprintOf(inputs, version, "code");
    const changed = [
      { ...inputs, cvText: `${inputs.cvText}x` },
      { ...inputs, jobAd: `${inputs.jobAd}x` },
      { ...inputs, jobTitle: "Annen tittel" },
      { ...inputs, employer: "Annen arbeidsgiver" },
    ].map((other) => fingerprintOf(other, version, "code"));
    for (const fingerprint of changed) expect(fingerprint).not.toBe(base);
    expect(new Set([base, ...changed]).size).toBe(5);
  });

  it("differs by vocabulary version and Keyword source", () => {
    const base = fingerprintOf(inputs, version, "code");
    expect(fingerprintOf(inputs, "v1-89abcdef", "code")).not.toBe(base);
    expect(fingerprintOf(inputs, version, "saved")).not.toBe(base);
  });

  it("ignores whitespace differences that canon removes", () => {
    const spaced = { ...inputs, jobTitle: "  Junior   frontendutvikler\n" };
    expect(fingerprintOf(spaced, version, "code")).toBe(
      fingerprintOf(inputs, version, "code"),
    );
  });

  it("does not confuse field boundaries", () => {
    const a = { ...inputs, jobTitle: "ab", employer: "c" };
    const b = { ...inputs, jobTitle: "a", employer: "bc" };
    expect(fingerprintOf(a, version, "code")).not.toBe(
      fingerprintOf(b, version, "code"),
    );
  });
});
