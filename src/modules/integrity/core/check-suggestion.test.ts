import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { checkSuggestion } from "./check-suggestion";
import { UPGRADE_WORDS } from "./word-lists";

const vocabulary: Vocabulary = {
  vocabularyVersion: "v1-00000000",
  terms: ["TypeScript", "REST-API", "API"],
  aliases: { TypeScript: ["TS"] },
};

// Two CV entries (blocks bounded by a blank line): the Upgrade word «forsket»
// stands in the second one only.
const CV = [
  "Jeg skrev eksamensoppgave om sår og lærte å bruke Git.",
  "Jeg forsket på kost sammen med en professor og ledet gruppen.",
].join("\n\n");
const CITATION = "Jeg skrev eksamensoppgave om sår";

const MISSING = ["sårvurdering", "TypeScript", "REST-API", "testing"];

function check(
  suggestion: string,
  overrides: Partial<Parameters<typeof checkSuggestion>[0]> = {},
) {
  return checkSuggestion({
    suggestion,
    gap: { keyword: "sårvurdering", citation: CITATION },
    missing: MISSING,
    sentCvText: CV,
    vocabulary,
    ...overrides,
  });
}

describe("FR-17 checkSuggestion: another Missing keyword", () => {
  it("keeps a suggestion that names only its own Keyword", () => {
    expect(check("Skrev eksamensoppgave om sårvurdering.")).toEqual({
      ok: true,
    });
  });

  it("keeps a suggestion that names no Keyword at all", () => {
    expect(check("Skrev eksamensoppgave om sår.")).toEqual({ ok: true });
  });

  it("discards a suggestion that names another Missing keyword as an Unsupported claim", () => {
    expect(check("Skrev eksamensoppgave om sårvurdering med testing.")).toEqual(
      { ok: false, reason: "UNSUPPORTED_CLAIM" },
    );
  });

  it("finds the other keyword in another case", () => {
    expect(check("Skrev eksamensoppgave om typescript.")).toEqual({
      ok: false,
      reason: "UNSUPPORTED_CLAIM",
    });
  });

  it("finds the other keyword by one of its aliases", () => {
    expect(check("Skrev eksamensoppgave om sår i TS.")).toEqual({
      ok: false,
      reason: "UNSUPPORTED_CLAIM",
    });
  });

  it("does not count a word that only shares part of a compound", () => {
    expect(check("Skrev eksamensoppgave om sår og testingstider.")).toEqual({
      ok: true,
    });
  });

  it("does not count the Gap's own Keyword, also when another Missing keyword is part of it", () => {
    const missing = ["REST-API", "API"];
    expect(
      check("Lærte REST-API.", {
        gap: { keyword: "REST-API", citation: CITATION },
        missing,
      }),
    ).toEqual({ ok: true });
    // ... but the shorter keyword on its own is another keyword.
    expect(
      check("Lærte API.", {
        gap: { keyword: "REST-API", citation: CITATION },
        missing,
      }),
    ).toEqual({ ok: false, reason: "UNSUPPORTED_CLAIM" });
  });

  it("finds a longer Missing keyword that holds the own one, and skips an empty term", () => {
    expect(
      check("Lærte REST-API.", {
        gap: { keyword: "API", citation: CITATION },
        missing: ["API", "REST-API", "  "],
      }),
    ).toEqual({ ok: false, reason: "UNSUPPORTED_CLAIM" });
    expect(
      check("Lærte API.", {
        gap: { keyword: "API", citation: CITATION },
        missing: ["API", "REST-API", "  "],
      }),
    ).toEqual({ ok: true });
  });

  it("matches the own Keyword's spelling loosely (case and white space)", () => {
    expect(
      check("Lærte  TYPESCRIPT.", {
        gap: { keyword: "typescript", citation: CITATION },
        missing: ["TypeScript"],
      }),
    ).toEqual({ ok: true });
  });
});

describe("FR-17 checkSuggestion: Upgrade words", () => {
  it("discards an Upgrade word the cited entry holds in no form", () => {
    expect(check("Forsket på sårvurdering")).toEqual({
      ok: false,
      reason: "UPGRADE_WORD",
    });
  });

  it("keeps a suggestion with no Upgrade word", () => {
    expect(check("Kompetanse i sårvurdering")).toEqual({ ok: true });
  });

  it("holds the suggestion against the entry around the citation, not the whole CV", () => {
    // «forsket» stands in the second entry of the CV, so it clears a line cited
    // from that entry and not a line cited from the first.
    expect(
      check("Forsket på kost.", {
        gap: { keyword: "kost", citation: "Jeg forsket på kost" },
        missing: ["kost"],
      }),
    ).toEqual({ ok: true });
    expect(check("Forsket på sår.")).toEqual({
      ok: false,
      reason: "UPGRADE_WORD",
    });
  });

  it("counts «forsket», «forsker» and «forskning» as the same word, in the CV and in the suggestion", () => {
    const cvs = [
      "Jeg forsket på sår.",
      "Jeg er forsker på sår.",
      "Jeg drev forskning på sår.",
    ];
    const suggestions = [
      "Forsket på sår",
      "Forsker på sår",
      "Drev forskning på sår",
    ];
    for (const cv of cvs) {
      for (const suggestion of suggestions) {
        expect(
          check(suggestion, {
            gap: { keyword: "sår", citation: "Jeg" },
            missing: ["sår"],
            sentCvText: cv,
          }),
          `${suggestion} / ${cv}`,
        ).toEqual({ ok: true });
      }
    }
  });

  it.each([
    "Forsket på sår",
    "Forsker på sår",
    "Drev forskning på sår",
    "Forskningen viste sår",
  ])("discards «%s» when the entry has none of the forms", (suggestion) => {
    expect(check(suggestion)).toEqual({ ok: false, reason: "UPGRADE_WORD" });
  });

  it("covers every word of the Upgrade list", () => {
    const uses: Record<string, string> = {
      forsket: "Forsket på sår",
      ledet: "Ledet gruppen om sår",
      "ansvarlig for": "Ansvarlig for sår",
      publiserte: "Publiserte om sår",
      grunnla: "Grunnla gruppen om sår",
    };
    expect(Object.keys(uses).sort()).toEqual([...UPGRADE_WORDS].sort());
    for (const suggestion of Object.values(uses)) {
      expect(check(suggestion), suggestion).toEqual({
        ok: false,
        reason: "UPGRADE_WORD",
      });
    }
  });

  it("clears a word by a CV phrase that means the same", () => {
    const cv = "Jeg hadde ansvar for kassen og skrev om sår.";
    expect(
      check("Ansvarlig for sår", {
        gap: { keyword: "sår", citation: "Jeg hadde ansvar for kassen" },
        missing: ["sår"],
        sentCvText: cv,
      }),
    ).toEqual({ ok: true });
  });

  it("clears a word by an inflection in the cited entry", () => {
    expect(
      check("Leder gruppen", {
        gap: { keyword: "gruppe", citation: "Jeg forsket på kost" },
        missing: ["gruppe"],
      }),
    ).toEqual({ ok: true });
  });

  it("reads an Upgrade phrase as a phrase, never one of its words alone", () => {
    expect(check("Ansvaret var stort, for sår")).toEqual({ ok: true });
    // The CV phrase that means the same counts in a suggestion too.
    expect(check("Hadde ansvar for sår")).toEqual({
      ok: false,
      reason: "UPGRADE_WORD",
    });
  });

  it("discards an Upgrade word when no single entry holds the citation", () => {
    expect(
      check("Forsket på sår", {
        gap: { keyword: "sår", citation: "sår og lærte å bruke Git" },
        missing: ["sår"],
        sentCvText: "Jeg skrev om sår\n\nog lærte å bruke Git",
      }),
    ).toEqual({ ok: false, reason: "NO_CITED_ENTRY" });
  });

  it("keeps a suggestion with no Upgrade word when no entry holds the citation", () => {
    expect(
      check("Kompetanse i sår", {
        gap: { keyword: "sår", citation: null },
        missing: ["sår"],
      }),
    ).toEqual({ ok: true });
  });

  it("holds the suggestion against every entry that holds the citation", () => {
    const cv = "Jeg skrev om sår.\n\nJeg forsket og skrev om sår.";
    expect(
      check("Forsket på sår", {
        gap: { keyword: "sår", citation: "skrev om sår" },
        missing: ["sår"],
        sentCvText: cv,
      }),
    ).toEqual({ ok: false, reason: "UPGRADE_WORD" });
    expect(
      check("Forsket på sår", {
        gap: { keyword: "sår", citation: "forsket og skrev om sår" },
        missing: ["sår"],
        sentCvText: cv,
      }),
    ).toEqual({ ok: true });
  });

  it("finds the citation with the case and white space tolerance of FR-15", () => {
    expect(
      check("Forsket på kost.", {
        gap: { keyword: "kost", citation: "JEG  FORSKET\npå kost" },
        missing: ["kost"],
      }),
    ).toEqual({ ok: true });
  });
});

describe("FR-17 checkSuggestion: the nursing Fixture's exam-paper entry", () => {
  const cv = readFileSync("data/fixtures/nursing-sarvurdering/cv.txt", "utf8");
  const missing = (
    JSON.parse(
      readFileSync(
        "data/fixtures/nursing-sarvurdering/answer-key.json",
        "utf8",
      ),
    ) as { keywords: { missing: string[] } }
  ).keywords.missing;
  const gap = {
    keyword: "sårvurdering",
    citation:
      "Skrev eksamensoppgave om diabetiske fotsår vs trykksår (likheter og forskjeller)",
  };
  const run = (suggestion: string) =>
    checkSuggestion({ suggestion, gap, missing, sentCvText: cv, vocabulary });

  it("discards «Forsket på sårvurdering»", () => {
    expect(run("Forsket på sårvurdering")).toEqual({
      ok: false,
      reason: "UPGRADE_WORD",
    });
  });

  it("keeps «Kompetanse i sårvurdering»", () => {
    expect(run("Kompetanse i sårvurdering")).toEqual({ ok: true });
  });
});
