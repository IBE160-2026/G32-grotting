import { describe, expect, it } from "vitest";
import { type CheckableGap, checkCitation } from "./check-citation";

const CV = [
  "Prosjekt",
  "- Vi brukte Git og GitHub, og alle endringer ble gjennomgått av et annet",
  "gruppemedlem før de ble slått sammen.",
  "- Jeg skrev enkle tester for skjemaene våre.",
].join("\r\n");

const rewordable = (citation: string | null): CheckableGap => ({
  keyword: "pull requests",
  kind: "rewordable",
  citation,
});

describe("FR-15 checkCitation", () => {
  it("passes an exact citation", () => {
    expect(
      checkCitation(
        rewordable("Jeg skrev enkle tester for skjemaene våre."),
        CV,
      ),
    ).toBe(true);
  });

  it("passes a citation that differs only in case and white space", () => {
    expect(
      checkCitation(
        rewordable(
          "VI BRUKTE git og github, og alle\nendringer ble  gjennomgått av et annet gruppemedlem",
        ),
        CV,
      ),
    ).toBe(true);
  });

  it("passes a citation that stands inside a longer line", () => {
    expect(checkCitation(rewordable("skrev enkle tester"), CV)).toBe(true);
  });

  it("fails a citation with one changed word", () => {
    expect(
      checkCitation(
        rewordable("Jeg skrev enkle tester for skjemaene dine."),
        CV,
      ),
    ).toBe(false);
  });

  it("fails a paraphrase", () => {
    expect(
      checkCitation(
        rewordable("Endringene ble sjekket av en annen i gruppen."),
        CV,
      ),
    ).toBe(false);
  });

  it("fails a changed ending, a changed punctuation mark and a split word", () => {
    expect(
      checkCitation(rewordable("Jeg skrev enkle test for skjemaene våre"), CV),
    ).toBe(false);
    expect(
      checkCitation(
        rewordable("Jeg skrev enkle tester for skjemaene, våre"),
        CV,
      ),
    ).toBe(false);
    expect(
      checkCitation(
        rewordable("Jeg skrev enkle te ster for skjemaene våre"),
        CV,
      ),
    ).toBe(false);
  });

  it("fails a citation that joins words the CV has apart or vice versa", () => {
    expect(checkCitation(rewordable("Jegskrev enkle tester"), CV)).toBe(false);
  });

  it("fails an empty or blank citation, which is a substring of everything", () => {
    expect(checkCitation(rewordable(""), CV)).toBe(false);
    expect(checkCitation(rewordable("  \n "), CV)).toBe(false);
    expect(checkCitation(rewordable(null), CV)).toBe(false);
  });

  it("fails a Real gap, even when its citation happens to be in the CV", () => {
    expect(
      checkCitation(
        { keyword: "x", kind: "real", citation: "skrev enkle tester" },
        CV,
      ),
    ).toBe(false);
  });

  it("fails against an empty CV text", () => {
    expect(checkCitation(rewordable("Git"), "")).toBe(false);
  });
});
