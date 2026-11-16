import { describe, expect, it } from "vitest";
import {
  CV_MAX,
  CV_MIN,
  cvLengthError,
  cvSubmitError,
  restoreCv,
} from "./contracts";

const VALID = "a".repeat(3412);

describe("FR-2 CV text length", () => {
  it("accepts the limits", () => {
    expect(cvLengthError("a".repeat(CV_MIN))).toBeUndefined();
    expect(cvLengthError("a".repeat(CV_MAX))).toBeUndefined();
  });

  it("rejects 199 and 20 001 characters", () => {
    expect(cvLengthError("a".repeat(CV_MIN - 1))).toBe("CV_LENGTH");
    expect(cvLengthError("a".repeat(CV_MAX + 1))).toBe("CV_LENGTH");
  });

  it("does not count surrounding whitespace toward the minimum", () => {
    expect(cvLengthError(`${" ".repeat(50)}${"a".repeat(199)}`)).toBe(
      "CV_LENGTH",
    );
  });

  it("rejects empty text", () => {
    expect(cvLengthError("")).toBe("CV_LENGTH");
  });
});

describe("FR-3 submit gate", () => {
  it("reports the length before the missing confirmation", () => {
    expect(cvSubmitError("", false)).toBe("CV_LENGTH");
    expect(cvSubmitError("too short", true)).toBe("CV_LENGTH");
  });

  it("blocks valid text that is not confirmed", () => {
    expect(cvSubmitError(VALID, false)).toBe("CV_NOT_CONFIRMED");
  });

  it("lets confirmed valid text through", () => {
    expect(cvSubmitError(VALID, true)).toBeUndefined();
  });
});

describe("AD-16 restoring the CV after a refresh", () => {
  it("is empty when nothing is stored", () => {
    expect(restoreCv({})).toEqual({ draft: "", confirmed: false });
  });

  it("restores confirmed text as confirmed", () => {
    expect(restoreCv({ cvText: VALID, cvDraft: VALID })).toEqual({
      draft: VALID,
      confirmed: true,
    });
    expect(restoreCv({ cvText: VALID })).toEqual({
      draft: VALID,
      confirmed: true,
    });
  });

  it("restores an unconfirmed draft as a draft", () => {
    expect(restoreCv({ cvDraft: VALID })).toEqual({
      draft: VALID,
      confirmed: false,
    });
  });

  it("does not trust a confirmed text that differs from the draft or is invalid", () => {
    expect(restoreCv({ cvText: VALID, cvDraft: `${VALID}x` }).confirmed).toBe(
      false,
    );
    expect(restoreCv({ cvText: "short", cvDraft: "short" }).confirmed).toBe(
      false,
    );
  });
});
