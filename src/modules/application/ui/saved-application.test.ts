import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Gap } from "@/modules/gaps/contracts";
import type { Letter, LetterFlagWire } from "@/modules/letter/contracts";
import type { AnalysisResult } from "@/modules/match/contracts";
import { messages } from "@/shared/ui/messages.nb";
import { type RunMode, RunModeProvider } from "@/shared/ui/run-mode";
import type { SavedApplication } from "../saved-contracts";
import {
  gapsPlacement,
  SavedBody,
  savedCheckState,
  savedCredits,
  savedGapTargets,
} from "./saved-application";

// Story 6.9: a saved Application as markup, built from the hand-made result.

const ad = "TypeScript er viktig i rollen.\n\nKubernetes er et pluss.";
const result: AnalysisResult = {
  keywordSource: "code",
  score: 50,
  matchedCount: 1,
  totalCount: 2,
  adParagraphs: 2,
  formula: {
    key: "MATCH_FORMULA",
    params: { matched: 1, total: 2, score: 50 },
  },
  matched: [
    {
      term: "TypeScript",
      stage: "exact",
      positions: [{ paragraph: 0, start: 0, end: 10 }],
      evidence: {
        stage: "exact",
        line: 1,
        text: "Jeg kan TypeScript",
        start: 8,
        end: 18,
      },
    },
  ],
  missing: [
    {
      term: "Kubernetes",
      stage: "exact",
      positions: [{ paragraph: 1, start: 0, end: 10 }],
      explanation: {
        key: "MISSING_KEYWORD",
        params: { keyword: "Kubernetes" },
      },
    },
  ],
};
const missingTerm = "Kubernetes";

const letter: Letter = {
  text: "Hei Nordic Digital,\n\nJeg kan TypeScript og ledet gruppen.\n\nMed hilsen\n{{SIGNATUR}}",
  tone: "Personlig",
  rev: 1,
};
const gap: Gap = {
  keyword: missingTerm,
  kind: "real",
  explanation: { key: "REAL_GAP", params: { keyword: missingTerm } },
  citation: null,
  suggestion: null,
};
const flag: LetterFlagWire = {
  kind: "UNSUPPORTED_CLAIM",
  term: "TypeScript",
  word: "TypeScript",
  spans: [{ start: 24, end: 34 }],
};
const PREVIOUS = "00000000-0000-4000-8000-000000000001";

function saved(patch: Partial<SavedApplication> = {}): SavedApplication {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    seq: 2,
    createdAt: "2026-11-17T10:00:00.000Z",
    previous: { id: PREVIOUS, seq: 1, employer: "Fjord Analytics" },
    job: {
      status: "ok",
      value: {
        jobAd: ad,
        jobTitle: "Frontendutvikler",
        employer: "Nordic Digital",
      },
    },
    analysis: { status: "ok", value: result },
    gaps: { status: "ok", value: [gap] },
    letter: { status: "ok", value: letter },
    check: [flag],
    ...patch,
  };
}

function runMode(gaps: boolean): RunMode {
  return {
    testMode: true,
    hosted: false,
    features: {
      accounts: true,
      gaps,
      rewording: false,
      keywordFallback: true,
    },
    aiNotice: { version: "v1", providerName: "x", retentionDays: null },
  };
}

function html(
  value: SavedApplication,
  { gaps = true, name = "Violet Hansen" } = {},
) {
  return renderToStaticMarkup(
    RunModeProvider({
      value: runMode(gaps),
      children: createElement(SavedBody, { saved: value, name }),
    }),
  );
}

const text = (markup: string) => markup.replace(/<[^>]*>/g, "");
const navOf = (markup: string) =>
  markup.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? "";
const headingOf = (markup: string) =>
  markup.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "";

describe("a complete entry", () => {
  const markup = html(saved());

  it("has the catalogue heading and the nav with the previous entry and Historikk", () => {
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(text(headingOf(markup))).toBe("JA-002·, Nordic Digital");
    const nav = navOf(markup);
    expect(nav).toContain('aria-label="I Historikk"');
    expect(nav).toContain(`href="/historikk/${PREVIOUS}"`);
    expect(text(nav)).toContain("JA-001 · Fjord Analytics");
    expect(nav).toContain('href="/historikk"');
  });

  it("shows the credits with the position, the date and the Tone of the stored Letter", () => {
    expect(markup).toContain("Frontendutvikler");
    expect(text(markup)).toMatch(/Dato.*2026/);
    expect(text(markup)).toContain("TonePersonlig");
  });

  it("shows the score, both lists with a gap link, Gapanalyse and Søknadsbrev in that order", () => {
    expect(markup).toContain("score-heading");
    expect(markup).toContain(messages.result.missing.gapLink);
    expect(markup.indexOf("Gapanalyse")).toBeGreaterThan(
      markup.indexOf("score-heading"),
    );
    expect(markup.indexOf("Søknadsbrev")).toBeGreaterThan(
      markup.indexOf("Gapanalyse"),
    );
  });

  it("signs the Letter with the Profile name and shows the check's flags", () => {
    expect(markup).toContain("Violet Hansen");
    expect(markup).not.toContain("[Navnet ditt]");
    expect(markup).toContain(messages.letter.check.sectionName);
  });

  it("has «Kopier» and «Last ned (.docx)» but no regenerate, no retry, no check again", () => {
    expect(markup).toContain("Kopier");
    expect(markup).toContain("Last ned (.docx)");
    expect(markup).not.toContain("Lag nytt utkast");
    expect(markup).not.toContain("Sjekk igjen");
    expect(markup).not.toContain("Prøv igjen");
    expect(markup).toContain(messages.saved.letterHint);
  });
});

describe("a section never made", () => {
  it("shows «Ikke laget.» under the real Søknadsbrev heading, with no Tone and no buttons", () => {
    const markup = html(saved({ letter: { status: "missing" }, check: null }));
    expect(markup).toMatch(/<h2[^>]*>Søknadsbrev<\/h2>/);
    expect(text(markup)).toContain("Ikke laget.");
    expect(text(markup)).not.toContain("Tone");
    expect(markup).not.toContain("Last ned (.docx)");
    expect(markup).not.toContain("Kopier");
  });

  it("shows «Ikke laget.» under Gapanalyse when Gaps are on and Missing keywords exist, with no gap links", () => {
    const markup = html(saved({ gaps: { status: "missing" } }));
    expect(markup).toMatch(/<h2[^>]*>Gapanalyse<\/h2>/);
    expect(markup).not.toContain(messages.result.missing.gapLink);
    expect(text(markup)).toContain("Ikke laget.");
  });

  it("hides Gapanalyse when Gaps are off, or when nothing was missing", () => {
    const missing = saved({ gaps: { status: "missing" } });
    expect(html(missing, { gaps: false })).not.toMatch(
      /<h2[^>]*>Gapanalyse<\/h2>/,
    );
    const none = saved({
      gaps: { status: "missing" },
      analysis: { status: "ok", value: { ...result, missing: [] } },
    });
    expect(html(none)).not.toMatch(/<h2[^>]*>Gapanalyse<\/h2>/);
  });

  it("shows stored Gaps whatever the flag says", () => {
    expect(html(saved(), { gaps: false })).toMatch(/<h2[^>]*>Gapanalyse<\/h2>/);
  });
});

describe("the check", () => {
  it("shows the unchecked notice without a retry when there is no valid check", () => {
    const markup = html(saved({ check: null }));
    expect(text(markup)).toContain(messages.letter.check.unchecked);
    expect(markup).not.toContain(messages.letter.check.retry);
    expect(markup).not.toContain(messages.letter.check.sectionName);
  });

  it("maps flags to a done state and no check to the unchecked state", () => {
    expect(savedCheckState([flag])).toEqual({ kind: "done", flags: [flag] });
    expect(savedCheckState([])).toEqual({ kind: "done", flags: [] });
    expect(savedCheckState(null)).toEqual({ kind: "failed", busy: false });
  });
});

describe("unreadable sections", () => {
  it("says «Kan ikke leses.» for an unreadable Letter and Gaps and keeps the rest", () => {
    const markup = html(
      saved({
        letter: { status: "unreadable" },
        gaps: { status: "unreadable" },
        check: null,
      }),
    );
    expect(text(markup).match(/Kan ikke leses\./g)).toHaveLength(2);
    expect(markup).toMatch(/<h2[^>]*>Gapanalyse<\/h2>/);
    expect(markup).toMatch(/<h2[^>]*>Søknadsbrev<\/h2>/);
    expect(markup).toContain("score-heading");
  });

  it("keeps the number alone in the heading and says so for the Refleksjonsnotat when the job cannot be read", () => {
    const markup = html(saved({ job: { status: "unreadable" } }));
    expect(text(headingOf(markup))).toBe("JA-002");
    expect(text(markup)).toContain("Kan ikke leses.");
    expect(markup).not.toContain("score-heading");
    expect(markup).toMatch(/<h2[^>]*>Søknadsbrev<\/h2>/);
    expect(markup).toContain("Last ned (.docx)");
  });

  it("says «Kan ikke leses.» for the Refleksjonsnotat when the analysis cannot be read", () => {
    const markup = html(saved({ analysis: { status: "unreadable" } }));
    expect(text(markup)).toContain("Kan ikke leses.");
    expect(markup).not.toContain("score-heading");
  });
});

describe("the previous entry", () => {
  it("is absent on the first entry, which has only the link to Historikk", () => {
    const nav = navOf(html(saved({ seq: 1, previous: null })));
    expect(nav.match(/<a /g)).toHaveLength(1);
    expect(nav).toContain('href="/historikk"');
  });

  it("is named by its number alone when its employer is unknown", () => {
    const nav = navOf(
      html(saved({ previous: { id: PREVIOUS, seq: 1, employer: null } })),
    );
    expect(text(nav)).toContain("JA-001");
    expect(text(nav)).not.toContain("JA-001 ·");
  });
});

describe("pure parts", () => {
  it("places Gapanalyse by what was stored, the flag and what was due", () => {
    const base = saved();
    expect(gapsPlacement(base, false)).toBe("show");
    expect(
      gapsPlacement({ ...base, gaps: { status: "unreadable" } }, false),
    ).toBe("unreadable");
    const none = { ...base, gaps: { status: "missing" } } as const;
    expect(gapsPlacement(none, false)).toBe("hidden");
    expect(gapsPlacement(none, true)).toBe("notMade");
    expect(
      gapsPlacement(
        {
          ...none,
          analysis: { status: "ok", value: { ...result, missing: [] } },
        },
        true,
      ),
    ).toBe("hidden");
    expect(
      gapsPlacement({ ...none, analysis: { status: "unreadable" } }, true),
    ).toBe("notMade");
  });

  it("links a Missing keyword to its Gap only when Gaps are shown", () => {
    expect(savedGapTargets({ status: "missing" })).toBeUndefined();
    expect(savedGapTargets({ status: "unreadable" })).toBeUndefined();
    expect(savedGapTargets({ status: "ok", value: [gap] })).toEqual({
      [missingTerm]: expect.stringMatching(/\S/),
    });
  });

  it("leaves out the credits that cannot be read, and the Tone of a Letter never made", () => {
    const terms = (value: SavedApplication) =>
      savedCredits(value).map((credit) => credit.term);
    expect(terms(saved())).toEqual(["Stilling", "Dato", "Tone", "Annonse"]);
    expect(terms(saved({ letter: { status: "missing" } }))).toEqual([
      "Stilling",
      "Dato",
      "Annonse",
    ]);
    expect(
      terms(
        saved({
          job: { status: "unreadable" },
          analysis: { status: "unreadable" },
        }),
      ),
    ).toEqual(["Dato", "Tone"]);
  });
});
