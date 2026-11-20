import { describe, expect, expectTypeOf, it } from "vitest";
import type { CheckableGap, LetterFlag } from "@/modules/integrity/core";
import {
  type CheckGap,
  LETTER_CHECK_GAPS_MAX,
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

  it("keeps the check's Gap schema assignable to integrity/core's CheckableGap", () => {
    expectTypeOf<CheckGap>().toExtend<CheckableGap>();
    expectTypeOf<CheckableGap>().toExtend<CheckGap>();
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

  it("takes gaps as null or a list of keyword, kind and citation", () => {
    const gap = { keyword: "testing", kind: "rewordable", citation: "Tester." };
    const parse = (gaps: unknown) =>
      letterCheckRequestSchema.safeParse({ ...request, gaps });
    expect(parse(null).success).toBe(true);
    expect(parse([]).success).toBe(true);
    expect(parse([gap, { ...gap, kind: "real", citation: null }]).success).toBe(
      true,
    );
    expect(parse({}).success).toBe(false);
    expect(parse([{ ...gap, kind: "other" }]).success).toBe(false);
    expect(parse([{ keyword: "testing", kind: "real" }]).success).toBe(false);
  });

  it("drops what the check does not read, and caps the list", () => {
    const gap = {
      keyword: "testing",
      kind: "rewordable",
      citation: "Tester.",
      explanation: { text: "x" },
      suggestion: null,
    };
    const parsed = letterCheckRequestSchema.parse({
      ...request,
      gaps: [gap],
    });
    expect(parsed.gaps).toEqual([
      { keyword: "testing", kind: "rewordable", citation: "Tester." },
    ]);
    const many = Array.from({ length: LETTER_CHECK_GAPS_MAX + 1 }, () => gap);
    expect(
      letterCheckRequestSchema.safeParse({ ...request, gaps: many }).success,
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
