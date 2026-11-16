import { describe, expect, it } from "vitest";
import {
  type AnalysisInputs,
  analysisInputsSchema,
  jobInputErrors,
  normaliseNewlines,
} from "./contracts";

const valid: AnalysisInputs = {
  jobAd: "a".repeat(200),
  jobTitle: "Junior frontendutvikler",
  employer: "Nordic Digital",
};

describe("FR-4 analysis inputs", () => {
  it("accepts valid inputs and the limits", () => {
    expect(analysisInputsSchema.safeParse(valid).success).toBe(true);
    expect(
      jobInputErrors({
        jobAd: "a".repeat(15_000),
        jobTitle: "t".repeat(200),
        employer: "e".repeat(200),
      }),
    ).toEqual({});
  });

  it("reports all three fields when empty", () => {
    expect(jobInputErrors({ jobAd: "", jobTitle: "", employer: "" })).toEqual({
      jobAd: "JOB_AD_LENGTH",
      jobTitle: "JOB_TITLE_REQUIRED",
      employer: "EMPLOYER_REQUIRED",
    });
  });

  it("rejects a Job ad of 199 and of 15 001 characters, keeping 200", () => {
    expect(jobInputErrors({ ...valid, jobAd: "a".repeat(199) }).jobAd).toBe(
      "JOB_AD_LENGTH",
    );
    expect(jobInputErrors({ ...valid, jobAd: "a".repeat(15_001) }).jobAd).toBe(
      "JOB_AD_LENGTH",
    );
    expect(jobInputErrors({ ...valid, jobAd: "a".repeat(200) }).jobAd).toBe(
      undefined,
    );
  });

  it("does not count surrounding whitespace toward the minimum", () => {
    expect(
      jobInputErrors({ ...valid, jobAd: ` ${"a".repeat(198)} ` }).jobAd,
    ).toBe("JOB_AD_LENGTH");
  });

  it("treats a whitespace-only title or employer as missing", () => {
    expect(
      jobInputErrors({ ...valid, jobTitle: "   ", employer: "\n" }),
    ).toEqual({
      jobTitle: "JOB_TITLE_REQUIRED",
      employer: "EMPLOYER_REQUIRED",
    });
  });

  it("limits title and employer to 200 characters", () => {
    expect(
      jobInputErrors({
        ...valid,
        jobTitle: "t".repeat(201),
        employer: "e".repeat(201),
      }),
    ).toEqual({ jobTitle: "TOO_LONG", employer: "TOO_LONG" });
  });
});

describe("FR-4 line endings", () => {
  it("turns CRLF and a lone CR into LF", () => {
    expect(normaliseNewlines("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});
