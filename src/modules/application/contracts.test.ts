import { describe, expect, it } from "vitest";
import {
  type AnalysisInputs,
  analysisInputsSchema,
  inputErrors,
  normaliseNewlines,
} from "./contracts";

const valid: AnalysisInputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Junior frontendutvikler",
  employer: "Nordic Digital",
};

describe("FR-4 analysis inputs", () => {
  it("accepts valid inputs and the limits", () => {
    expect(analysisInputsSchema.safeParse(valid).success).toBe(true);
    expect(
      inputErrors({
        cvText: "c".repeat(20_000),
        jobAd: "a".repeat(15_000),
        jobTitle: "t".repeat(200),
        employer: "e".repeat(200),
      }),
    ).toEqual({});
  });

  it("reports all four fields when empty", () => {
    expect(
      inputErrors({ cvText: "", jobAd: "", jobTitle: "", employer: "" }),
    ).toEqual({
      cvText: "CV_LENGTH",
      jobAd: "JOB_AD_LENGTH",
      jobTitle: "JOB_TITLE_REQUIRED",
      employer: "EMPLOYER_REQUIRED",
    });
  });

  it("rejects a Job ad of 199 and of 15 001 characters, keeping 200", () => {
    expect(inputErrors({ ...valid, jobAd: "a".repeat(199) }).jobAd).toBe(
      "JOB_AD_LENGTH",
    );
    expect(inputErrors({ ...valid, jobAd: "a".repeat(15_001) }).jobAd).toBe(
      "JOB_AD_LENGTH",
    );
    expect(inputErrors({ ...valid, jobAd: "a".repeat(200) }).jobAd).toBe(
      undefined,
    );
  });

  it("does not count surrounding whitespace toward the minimum", () => {
    expect(inputErrors({ ...valid, jobAd: ` ${"a".repeat(198)} ` }).jobAd).toBe(
      "JOB_AD_LENGTH",
    );
  });

  it("treats a whitespace-only title or employer as missing", () => {
    expect(inputErrors({ ...valid, jobTitle: "   ", employer: "\n" })).toEqual({
      jobTitle: "JOB_TITLE_REQUIRED",
      employer: "EMPLOYER_REQUIRED",
    });
  });

  it("limits title and employer to 200 characters", () => {
    expect(
      inputErrors({
        ...valid,
        jobTitle: "t".repeat(201),
        employer: "e".repeat(201),
      }),
    ).toEqual({ jobTitle: "TOO_LONG", employer: "TOO_LONG" });
  });
});

describe("FR-2 CV text in the inputs", () => {
  it("rejects a CV of 199 and of 20 001 characters, keeping 200", () => {
    expect(inputErrors({ ...valid, cvText: "c".repeat(199) })).toEqual({
      cvText: "CV_LENGTH",
    });
    expect(inputErrors({ ...valid, cvText: "c".repeat(20_001) })).toEqual({
      cvText: "CV_LENGTH",
    });
    expect(inputErrors({ ...valid, cvText: "c".repeat(200) })).toEqual({});
  });
});

describe("FR-4 line endings", () => {
  it("turns CRLF and a lone CR into LF", () => {
    expect(normaliseNewlines("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});
