import { describe, expect, it } from "vitest";
import { checkTone, countWords, firstSentenceOf } from "./check-tone";
import { ANECDOTE_MARKERS, MOTIVATION_PHRASES } from "./word-lists";

const TERMS = ["React", "junior frontendutvikler", "universell utforming"];

describe("FR-10 checkTone Formell", () => {
  it("is ok without an anecdote marker", () => {
    expect(
      checkTone(
        "Jeg søker stillingen. Jeg har erfaring fra studiene.",
        "Formell",
        TERMS,
      ),
    ).toEqual({ ok: true, problems: [] });
  });

  it("names an anecdote marker, in any case", () => {
    expect(
      checkTone("Hei.\n\nDA JEG VAR ung bygde jeg en nettside.", "Formell", []),
    ).toEqual({
      ok: false,
      problems: [{ code: "ANECDOTE_MARKER", marker: "Da jeg var" }],
    });
  });

  it("finds a marker across a line break but not inside a longer word", () => {
    expect(checkTone("Som\nbarn lærte jeg", "Formell", []).ok).toBe(false);
    expect(checkTone("Jeg husker godt.", "Formell", []).ok).toBe(false);
    expect(checkTone("Dette er Som barnslig tull", "Formell", []).ok).toBe(
      true,
    );
    expect(checkTone("Jeg husker1 ikke", "Formell", []).ok).toBe(true);
  });

  it.each(ANECDOTE_MARKERS)("flags the marker «%s»", (marker) => {
    expect(checkTone(`Hei. ${marker} noe.`, "Formell", []).ok).toBe(false);
  });
});

describe("FR-10 checkTone Personlig", () => {
  it("needs a motivation phrase", () => {
    expect(checkTone("Jeg søker stillingen.", "Personlig", [])).toEqual({
      ok: false,
      problems: [{ code: "NO_MOTIVATION_PHRASE" }],
    });
  });

  it("is ok with one, in any case", () => {
    expect(
      checkTone("Jeg BRENNER FOR universell utforming.", "Personlig", []).ok,
    ).toBe(true);
  });

  it.each(MOTIVATION_PHRASES)("accepts the phrase «%s»", (phrase) => {
    expect(checkTone(`Hei. ${phrase} dette.`, "Personlig", []).ok).toBe(true);
  });

  it("does not need Matched keywords or a length", () => {
    expect(checkTone("Det motiverer meg.", "Personlig", ["React"]).ok).toBe(
      true,
    );
  });
});

describe("FR-10 checkTone Direkte", () => {
  const letter = (first: string, extraWords = 0) =>
    `Hei Nordic Digital,\n\n${first} ${"ord ".repeat(extraWords)}\n\nMed vennlig hilsen\n{{SIGNATUR}}`;

  it("is ok with a Matched keyword in the first sentence", () => {
    expect(
      checkTone(letter("Jeg kan React og søker jobben."), "Direkte", TERMS),
    ).toEqual({ ok: true, problems: [] });
  });

  it("compares by the same word: inflection, case and multi-word terms", () => {
    expect(
      checkTone(
        letter("Som junior frontendutvikler bygger jeg nettsider."),
        "Direkte",
        TERMS,
      ).ok,
    ).toBe(true);
    expect(
      checkTone(letter("Jeg bryr meg om universell utforminger."), "Direkte", [
        "universell utforming",
      ]).ok,
    ).toBe(true);
    expect(checkTone(letter("Jeg liker react."), "Direkte", ["React"]).ok).toBe(
      true,
    );
  });

  it("does not count a keyword that is only in a later sentence", () => {
    expect(
      checkTone(letter("Jeg søker jobben. Jeg kan React."), "Direkte", TERMS),
    ).toEqual({
      ok: false,
      problems: [{ code: "NO_KEYWORD_IN_FIRST_SENTENCE" }],
    });
  });

  it("does not count part of a longer word", () => {
    expect(
      checkTone(letter("Jeg kan Reactive ting."), "Direkte", ["React"]).ok,
    ).toBe(false);
  });

  it("skips the greeting line when it looks for the first sentence", () => {
    expect(
      checkTone("Kjære React-teamet,\n\nJeg søker jobben din.", "Direkte", [
        "React",
      ]).ok,
    ).toBe(false);
  });

  it("allows 300 words and names 301", () => {
    const body = (words: number) =>
      `Jeg kan React. ${"ord ".repeat(words - 3)}\n{{SIGNATUR}}`;
    expect(checkTone(body(300), "Direkte", TERMS).ok).toBe(true);
    expect(checkTone(body(301), "Direkte", TERMS)).toEqual({
      ok: false,
      problems: [{ code: "TOO_MANY_WORDS", words: 301, max: 300 }],
    });
  });

  it("names both problems when both fail", () => {
    const result = checkTone(`Hei. ${"ord ".repeat(310)}`, "Direkte", TERMS);
    expect(result.problems.map((problem) => problem.code)).toEqual([
      "TOO_MANY_WORDS",
      "NO_KEYWORD_IN_FIRST_SENTENCE",
    ]);
  });

  it("does not ask for a keyword when there is no Matched keyword", () => {
    expect(checkTone("Hei. Jeg søker.", "Direkte", []).ok).toBe(true);
  });
});

describe("FR-10 word counting and the first sentence", () => {
  it("counts words and leaves the sign-off token out", () => {
    expect(countWords("a b\n\nc {{SIGNATUR}}")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("takes the first sentence after short greeting lines", () => {
    expect(
      firstSentenceOf("Hei,\nNordic Digital\n\nJeg søker. Takk for tiden."),
    ).toBe("Jeg søker.");
  });

  it("takes the whole body when it has no sentence mark", () => {
    const text =
      "Et langt avsnitt uten punktum som bare fortsetter og fortsetter og fortsetter her";
    expect(firstSentenceOf(text)).toBe(text);
  });
});
