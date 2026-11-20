import { describe, expect, expectTypeOf, it } from "vitest";
import type { LetterFlag } from "@/modules/integrity/core";
import {
  LETTER_CHECK_TEXT_MAX,
  type LetterFlagWire,
  letterCheckRequestSchema,
  letterCheckSchema,
} from "./contracts";

const inputs = {
  cvText: "c".repeat(300),
  jobAd: "a".repeat(300),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};

const request = {
  applicationId: "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f",
  fingerprint: "fp",
  inputs,
  letter: { text: "Hei", tone: "Formell", rev: 2 },
  gaps: null,
  letterRev: 2,
  gapsRev: 0,
};

describe("FR-11 letter-check wire shapes", () => {
  it("keeps the flag schema equal to integrity/core's LetterFlag", () => {
    expectTypeOf<LetterFlagWire>().toEqualTypeOf<LetterFlag>();
  });

  it("accepts a request and an answer", () => {
    expect(letterCheckRequestSchema.safeParse(request).success).toBe(true);
    expect(
      letterCheckSchema.safeParse({ flags: [], letterRev: 2, gapsRev: 0 })
        .success,
    ).toBe(true);
  });

  it("names letterRev when letter.rev differs from it", () => {
    const parsed = letterCheckRequestSchema.safeParse({
      ...request,
      letterRev: 3,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["letterRev"]);
  });

  it("takes gaps as null only", () => {
    expect(
      letterCheckRequestSchema.safeParse({ ...request, gaps: {} }).success,
    ).toBe(false);
  });

  it("caps the Letter text", () => {
    const long = {
      ...request.letter,
      text: "x".repeat(LETTER_CHECK_TEXT_MAX + 1),
    };
    expect(
      letterCheckRequestSchema.safeParse({ ...request, letter: long }).success,
    ).toBe(false);
  });
});
