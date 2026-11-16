import { describe, expect, it } from "vitest";
import {
  CV_FILE_MAX_BYTES,
  CV_MAX,
  CV_MIN,
  cvExtractResponseSchema,
  cvFileError,
  cvFileKind,
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

describe("FR-1 CV file check", () => {
  it("accepts .pdf and .txt up to 2 MB, in any case", () => {
    expect(cvFileError("cv.pdf", 1)).toBeUndefined();
    expect(cvFileError("CV.TXT", CV_FILE_MAX_BYTES)).toBeUndefined();
    expect(cvFileError("Min cv.Pdf", 0)).toBeUndefined();
  });

  it("rejects another type, and a name with no extension", () => {
    expect(cvFileError("cv.docx", 10)).toBe("FILE_TYPE");
    expect(cvFileError("cv", 10)).toBe("FILE_TYPE");
    expect(cvFileError("cv.pdf.exe", 10)).toBe("FILE_TYPE");
  });

  it("rejects 2 MB and one byte", () => {
    expect(cvFileError("cv.pdf", CV_FILE_MAX_BYTES + 1)).toBe("FILE_TOO_LARGE");
  });

  it("judges the type before the size", () => {
    expect(cvFileError("cv.docx", CV_FILE_MAX_BYTES + 1)).toBe("FILE_TYPE");
  });

  it("reads the kind from the extension", () => {
    expect(cvFileKind("a.PDF")).toBe("pdf");
    expect(cvFileKind("a.txt")).toBe("txt");
    expect(cvFileKind("a.md")).toBeUndefined();
  });

  it("parses the extract response", () => {
    expect(
      cvExtractResponseSchema.safeParse({ text: "", noText: true }).success,
    ).toBe(true);
    expect(cvExtractResponseSchema.safeParse({ text: "a" }).success).toBe(
      false,
    );
  });
});
