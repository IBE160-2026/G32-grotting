import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonVerbatim } from "@/shared/core/canon-verbatim";
import { log } from "@/shared/server/log";
import { REAL_GAP_KEY } from "../contracts";
import {
  type AiGapItem,
  analyseGaps,
  checkGapCitations,
  checkGapSuggestions,
  structureGaps,
} from "./analyse";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const missing = ["TypeScript", "REST-API", "pull requests"];

const real = (keyword: string, explanation = "CV-en viser ikke dette.") => ({
  keyword,
  kind: "real",
  explanation,
  citation: null,
});
const rewordable = (keyword: string, citation = "Jeg brukte Git.") => ({
  keyword,
  kind: "rewordable",
  explanation: "Linjen din dekker trolig dette – vurder å ta det med.",
  citation,
});
const template = (keyword: string) => ({
  keyword,
  kind: "real",
  explanation: { key: REAL_GAP_KEY, params: { keyword } },
  citation: null,
  suggestion: null,
});

describe("FR-13 structureGaps", () => {
  it("returns one Gap per Missing keyword, in Missing order, whatever the AI's order", () => {
    const gaps = structureGaps(missing, [
      real("pull requests"),
      real("TypeScript"),
      rewordable("REST-API"),
    ]);
    expect(gaps.map((gap) => gap.keyword)).toEqual(missing);
    expect(gaps.map((gap) => gap.kind)).toEqual(["real", "rewordable", "real"]);
  });

  it("keeps the Missing list's spelling, matching case and whitespace loosely", () => {
    const gaps = structureGaps(
      ["REST-API"],
      [real("  rest-api "), real("typescript")],
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.keyword).toBe("REST-API");
    expect(gaps[0]?.explanation).toEqual({ text: "CV-en viser ikke dette." });
  });

  it("drops extra items and lets the first item per keyword win", () => {
    const gaps = structureGaps(missing, [
      real("TypeScript", "Første."),
      real("TypeScript", "Andre."),
      real("Python"),
      real("REST-API"),
      real("pull requests"),
    ]);
    expect(gaps).toHaveLength(3);
    expect(gaps[0]?.explanation).toEqual({ text: "Første." });
  });

  it("turns a skipped Keyword into the template Real gap", () => {
    const gaps = structureGaps(missing, [
      real("TypeScript"),
      real("pull requests"),
    ]);
    expect(gaps[1]).toEqual(template("REST-API"));
  });

  it("turns every Keyword into the template when the AI answered nothing", () => {
    expect(structureGaps(missing, [])).toEqual(missing.map(template));
  });

  const unusable: [string, AiGapItem][] = [
    [
      "a Rewordable with no citation",
      { ...rewordable("TypeScript"), citation: null },
    ],
    ["a Rewordable with a blank citation", rewordable("TypeScript", "   ")],
    ["an unknown kind", { ...real("TypeScript"), kind: "kanskje" }],
    ["a blank explanation", real("TypeScript", "  ")],
  ];
  it.each(unusable)("turns %s into the template Real gap", (_name, item) => {
    expect(structureGaps(["TypeScript"], [item])).toEqual([
      template("TypeScript"),
    ]);
  });

  it("accepts the kind in any case and trims the explanation and the citation", () => {
    const gaps = structureGaps(
      ["testing"],
      [
        {
          keyword: "testing",
          kind: " Rewordable ",
          explanation: "  Forklaring.  ",
          citation: "  Jeg skrev tester  ",
        },
      ],
    );
    expect(gaps[0]).toEqual({
      keyword: "testing",
      kind: "rewordable",
      explanation: { text: "Forklaring." },
      citation: "Jeg skrev tester",
      suggestion: null,
    });
  });

  it("clears a Real gap's citation", () => {
    const gaps = structureGaps(
      ["x"],
      [{ ...real("x"), citation: "noe fra CV-en" }],
    );
    expect(gaps[0]?.citation).toBeNull();
  });

  const withSuggestion = (item: AiGapItem, suggestion: string | null) =>
    ({ ...item, suggestion }) as AiGapItem;

  it("sets every suggestion to null with rewording off, also when the AI wrote one", () => {
    const items = [
      withSuggestion(rewordable("TypeScript"), "Skriv dette."),
      withSuggestion(real("REST-API"), "Og dette."),
    ];
    expect(
      structureGaps(missing, items).every((gap) => gap.suggestion === null),
    ).toBe(true);
    expect(
      structureGaps(missing, items, false).every(
        (gap) => gap.suggestion === null,
      ),
    ).toBe(true);
  });

  it("FR-16: with rewording on, a Rewordable gap gets its trimmed suggestion and a Real gap null", () => {
    const gaps = structureGaps(
      missing,
      [
        withSuggestion(rewordable("TypeScript"), "  Skriv dette.  "),
        withSuggestion(real("REST-API"), "Og dette."),
      ],
      true,
    );
    expect(gaps[0]?.suggestion).toBe("Skriv dette.");
    expect(gaps[1]?.suggestion).toBeNull();
    expect(gaps[2]).toEqual(template("pull requests"));
  });

  it.each([
    ["null", null],
    ["blank", "   "],
  ])(
    "FR-16: a Rewordable gap with a %s suggestion has null, never a made-up one",
    (_name, suggestion) => {
      const gaps = structureGaps(
        ["TypeScript"],
        [withSuggestion(rewordable("TypeScript"), suggestion)],
        true,
      );
      expect(gaps[0]?.kind).toBe("rewordable");
      expect(gaps[0]?.suggestion).toBeNull();
    },
  );

  it("FR-16: a Rewordable item with no suggestion field (an older Cached file) has null", () => {
    const gaps = structureGaps(
      ["TypeScript"],
      [rewordable("TypeScript")],
      true,
    );
    expect(gaps[0]?.suggestion).toBeNull();
  });
});

type Adapter = NonNullable<
  NonNullable<Parameters<typeof analyseGaps>[2]>["adapter"]
>;

const inputs = {
  cvText: `${"Erfaring med Python og SQL i tre år. ".repeat(8)}\nJeg brukte Git.\nola@example.no`,
  jobAd: "Vi søker en utvikler med TypeScript.",
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const CTX = { studentId: null, consent: null };

function adapterOf(respond: (args: { prompt: string }) => unknown): Adapter {
  return {
    kind: "mock",
    provider: "mock",
    model: "mock-1",
    async generate(args) {
      return {
        output: respond(args),
        usage: { inputTokens: null, outputTokens: null },
      };
    },
  };
}

describe("FR-13 analyseGaps", () => {
  it("makes one adapter call and returns the structured Gaps with the meta", async () => {
    const respond = vi.fn((_args: { prompt: string }) => ({
      gaps: [real("REST-API"), rewordable("TypeScript")],
    }));
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript", "REST-API"] },
      CTX,
      { adapter: adapterOf(respond), testMode: true },
    );
    expect(respond).toHaveBeenCalledTimes(1);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps.map((gap) => gap.keyword)).toEqual([
      "TypeScript",
      "REST-API",
    ]);
    expect(result.value.gaps[0]?.kind).toBe("rewordable");
    expect(result.value.meta).toMatchObject({
      source: "mock",
      promptVersion: "gaps-3",
    });
  });

  it("FR-16: with rewording on it asks for a suggestion and returns it for the Rewordable gap only", async () => {
    const respond = vi.fn((_args: { prompt: string }) => ({
      gaps: [
        { ...rewordable("TypeScript"), suggestion: "Jeg brukte Git." },
        { ...real("REST-API"), suggestion: "Skal ikke slippe gjennom." },
      ],
    }));
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript", "REST-API"], rewording: true },
      CTX,
      { adapter: adapterOf(respond), testMode: true },
    );
    expect(respond.mock.calls[0]?.[0].prompt).toContain('"suggestion"');
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps.map((gap) => gap.suggestion)).toEqual([
      "Jeg brukte Git.",
      null,
    ]);
  });

  it("FR-16: with rewording off it asks for no suggestion and every suggestion is null", async () => {
    const respond = vi.fn((_args: { prompt: string }) => ({
      gaps: [{ ...rewordable("TypeScript"), suggestion: "Jeg brukte Git." }],
    }));
    for (const input of [
      { inputs, missingTerms: ["TypeScript"] },
      { inputs, missingTerms: ["TypeScript"], rewording: false },
    ]) {
      const result = await analyseGaps(input, CTX, {
        adapter: adapterOf(respond),
        testMode: true,
      });
      if (!result.ok) throw new Error("expected ok");
      expect(result.value.gaps.every((gap) => gap.suggestion === null)).toBe(
        true,
      );
    }
    for (const call of respond.mock.calls) {
      expect(call[0].prompt).not.toContain('"suggestion"');
    }
  });

  it("FR-16, FR-15: a Rewordable gap whose citation is not in the CV is the template, with no suggestion", async () => {
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript"], rewording: true },
      CTX,
      {
        adapter: adapterOf(() => ({
          gaps: [
            {
              ...rewordable("TypeScript", "Finnes ikke i CV-en."),
              suggestion: "Noe.",
            },
          ],
        })),
        testMode: true,
      },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps).toEqual([template("TypeScript")]);
  });

  it("sends the CV with its contact details stripped, the ad and the Missing keywords", async () => {
    const respond = vi.fn((_args: { prompt: string }) => ({ gaps: [] }));
    await analyseGaps({ inputs, missingTerms: ["TypeScript"] }, CTX, {
      adapter: adapterOf(respond),
      testMode: true,
    });
    const prompt = respond.mock.calls[0]?.[0].prompt ?? "";
    expect(prompt).toContain("Erfaring med Python og SQL");
    expect(prompt).not.toContain("ola@example.no");
    expect(prompt).toContain("Vi søker en utvikler med TypeScript.");
    expect(prompt).toContain("- TypeScript");
    expect(prompt).not.toContain("Nordic Digital");
  });

  it("turns a malformed item into a skipped Keyword and keeps the rest", async () => {
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript", "REST-API"] },
      CTX,
      {
        adapter: adapterOf(() => ({
          gaps: [
            { kind: "real", explanation: "uten nøkkelord" },
            { keyword: "TypeScript", explanation: "uten kind" },
            { keyword: "REST-API", kind: "real", explanation: null },
            "ikke et objekt",
          ],
        })),
        testMode: true,
      },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps).toEqual([
      template("TypeScript"),
      template("REST-API"),
    ]);
  });

  it("lets a usable item win over an earlier malformed one for the same keyword", async () => {
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript"] },
      CTX,
      {
        adapter: adapterOf(() => ({
          gaps: [
            { keyword: "TypeScript", kind: 3, explanation: "ødelagt" },
            real("TypeScript", "CV-en viser ikke TypeScript."),
          ],
        })),
        testMode: true,
      },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]?.explanation).toEqual({
      text: "CV-en viser ikke TypeScript.",
    });
  });

  it("makes no request when no Keyword is missing", async () => {
    const respond = vi.fn(() => ({ gaps: [] }));
    const result = await analyseGaps({ inputs, missingTerms: [] }, CTX, {
      adapter: adapterOf(respond),
      testMode: true,
    });
    expect(respond).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { gaps: [], meta: null } });
  });

  it("passes an AiFailure through: a bad answer shape is a retryable provider error", async () => {
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript"] },
      CTX,
      { adapter: adapterOf(() => ({ nei: true })), testMode: true },
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
  });

  it("answers AI_NOTICE_REQUIRED outside Test mode without consent, with no adapter call", async () => {
    const respond = vi.fn(() => ({ gaps: [] }));
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript"] },
      CTX,
      { adapter: adapterOf(respond), testMode: false },
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_NOTICE_REQUIRED", retryable: false },
    });
    expect(respond).not.toHaveBeenCalled();
  });
});

// The Gaps log events only: `runAi` logs its own `ai` event (AD-13).
const gapsEvents = () =>
  vi
    .mocked(log)
    .mock.calls.map(([event]) => event)
    .filter((event) => event.kind === "gaps");

const gapOf = (keyword: string, citation: string | null) => ({
  keyword,
  kind: citation === null ? ("real" as const) : ("rewordable" as const),
  explanation: { text: "AI-forklaring." },
  citation,
  suggestion: null,
});

describe("FR-15 checkGapCitations", () => {
  const CV = "Jeg brukte Git og GitHub.\nJeg skrev tester.";

  it("keeps a Rewordable gap whose citation is in the CV text", () => {
    const gap = gapOf("Git", "jeg  BRUKTE\nGit");
    expect(checkGapCitations([gap], CV)).toEqual({
      gaps: [gap],
      downgraded: 0,
    });
  });

  it("turns a Rewordable gap with an unfound citation into the template, dropping explanation, citation and suggestion", () => {
    const gap = {
      ...gapOf("testing", "Jeg skrev enkle tester."),
      suggestion: "x",
    };
    expect(checkGapCitations([gap], CV)).toEqual({
      gaps: [template("testing")],
      downgraded: 1,
    });
  });

  it("leaves Real gaps and the order alone and counts only the downgrades", () => {
    const real = gapOf("TypeScript", null);
    const result = checkGapCitations(
      [
        gapOf("a", "ikke i CV-en"),
        real,
        gapOf("Git", "Jeg brukte Git"),
        gapOf("b", "heller ikke"),
      ],
      CV,
    );
    expect(result.gaps.map((gap) => gap.keyword)).toEqual([
      "a",
      "TypeScript",
      "Git",
      "b",
    ]);
    expect(result.gaps.map((gap) => gap.kind)).toEqual([
      "real",
      "real",
      "rewordable",
      "real",
    ]);
    expect(result.gaps[1]).toBe(real);
    expect(result.downgraded).toBe(2);
  });
});

describe("FR-15 analyseGaps checks citations against the sent CV text", () => {
  beforeEach(() => vi.mocked(log).mockClear());

  it("downgrades a citation that is only in the contact lines the AI never saw, and logs a count only", async () => {
    const result = await analyseGaps(
      { inputs, missingTerms: ["TypeScript", "REST-API"] },
      CTX,
      {
        adapter: adapterOf(() => ({
          gaps: [
            rewordable("TypeScript", "ola@example.no"),
            rewordable("REST-API", "Jeg brukte Git."),
          ],
        })),
        testMode: true,
      },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]).toEqual(template("TypeScript"));
    expect(result.value.gaps[1]?.kind).toBe("rewordable");
    const events = gapsEvents();
    expect(events).toEqual([{ kind: "gaps", downgraded: 1, discarded: 0 }]);
    const logged = JSON.stringify(events);
    expect(logged).not.toContain("ola@example.no");
    expect(logged).not.toContain("Git");
    expect(logged).not.toContain("REST-API");
  });

  it("logs a count of zero when nothing is downgraded", async () => {
    await analyseGaps({ inputs, missingTerms: ["TypeScript"] }, CTX, {
      adapter: adapterOf(() => ({ gaps: [real("TypeScript")] })),
      testMode: true,
    });
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 0 },
    ]);
  });

  it("logs nothing when no request is made, and nothing when the request fails", async () => {
    await analyseGaps({ inputs, missingTerms: [] }, CTX, {
      adapter: adapterOf(() => ({ gaps: [] })),
      testMode: true,
    });
    await analyseGaps({ inputs, missingTerms: ["TypeScript"] }, CTX, {
      adapter: adapterOf(() => ({ nei: true })),
      testMode: true,
    });
    expect(gapsEvents()).toEqual([]);
  });
});

describe("FR-17 checkGapSuggestions", () => {
  const CV = "Jeg skrev eksamensoppgave om sår.\nJeg brukte Git.";
  const withSuggestion = (
    keyword: string,
    citation: string | null,
    suggestion: string | null,
  ) => ({ ...gapOf(keyword, citation), suggestion });

  it("keeps a clean suggestion and leaves Real gaps and Gaps with no suggestion alone", () => {
    const gaps = [
      withSuggestion("Git", "Jeg brukte Git.", "Brukte Git i prosjektet."),
      gapOf("TypeScript", null),
      withSuggestion("sår", "Jeg skrev eksamensoppgave om sår.", null),
    ];
    expect(checkGapSuggestions(gaps, ["Git", "TypeScript", "sår"], CV)).toEqual(
      { gaps, discarded: 0 },
    );
  });

  it("turns a discarded suggestion into null while citation and explanation stay, and counts it", () => {
    const gap = withSuggestion(
      "sår",
      "Jeg skrev eksamensoppgave om sår.",
      "Forsket på sår.",
    );
    const other = withSuggestion(
      "Git",
      "Jeg brukte Git.",
      "Brukte Git og TypeScript.",
    );
    const kept = withSuggestion(
      "x",
      "Jeg brukte Git.",
      "Brukte det i prosjektet.",
    );
    const result = checkGapSuggestions(
      [gap, other, kept],
      ["sår", "Git", "TypeScript", "x"],
      CV,
    );
    expect(result.discarded).toBe(2);
    expect(result.gaps[0]).toEqual({ ...gap, suggestion: null });
    expect(result.gaps[1]).toEqual({ ...other, suggestion: null });
    expect(result.gaps[1]?.explanation).toEqual({ text: "AI-forklaring." });
    expect(result.gaps[1]?.citation).toBe("Jeg brukte Git.");
    expect(result.gaps[2]).toBe(kept);
  });
});

describe("FR-17 analyseGaps: the order and the log", () => {
  beforeEach(() => vi.mocked(log).mockClear());

  const run = (gaps: unknown[], missingTerms: string[], rewording = true) =>
    analyseGaps({ inputs, missingTerms, rewording }, CTX, {
      adapter: adapterOf(() => ({ gaps })),
      testMode: true,
    });

  it("discards a suggestion that names another Missing keyword, keeps citation and explanation, and logs a count only", async () => {
    const result = await run(
      [
        {
          ...rewordable("TypeScript", "Jeg brukte Git."),
          suggestion: "Brukte Git sammen med REST-API.",
        },
        {
          ...rewordable("REST-API", "Jeg brukte Git."),
          suggestion: "Brukte Git i prosjektet.",
        },
      ],
      ["TypeScript", "REST-API"],
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]).toMatchObject({
      keyword: "TypeScript",
      kind: "rewordable",
      citation: "Jeg brukte Git.",
      explanation: { text: expect.any(String) },
      suggestion: null,
    });
    expect(result.value.gaps[1]?.suggestion).toBe("Brukte Git i prosjektet.");
    const events = gapsEvents();
    expect(events).toEqual([{ kind: "gaps", downgraded: 0, discarded: 1 }]);
    const logged = JSON.stringify(events);
    expect(logged).not.toContain("Git");
    expect(logged).not.toContain("REST-API");
  });

  it("discards an Upgrade word the cited entry lacks", async () => {
    const result = await run(
      [
        {
          ...rewordable("TypeScript", "Jeg brukte Git."),
          suggestion: "Ledet bruken av Git.",
        },
      ],
      ["TypeScript"],
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]?.suggestion).toBeNull();
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 1 },
    ]);
  });

  it("runs FR-15 before FR-17: a downgraded gap is the template and is not also counted as discarded", async () => {
    const result = await run(
      [
        {
          ...rewordable("TypeScript", "Finnes ikke i CV-en."),
          suggestion: "Ledet bruken av REST-API.",
        },
      ],
      ["TypeScript", "REST-API"],
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]).toEqual(template("TypeScript"));
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 1, discarded: 0 },
    ]);
  });

  it("runs the structure step before FR-17: a blank suggestion is null and is not counted", async () => {
    const result = await run(
      [{ ...rewordable("TypeScript", "Jeg brukte Git."), suggestion: "  " }],
      ["TypeScript"],
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]?.suggestion).toBeNull();
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 0 },
    ]);
  });

  it("with rewording off every suggestion is already null and nothing is discarded", async () => {
    const result = await run(
      [
        {
          ...rewordable("TypeScript", "Jeg brukte Git."),
          suggestion: "Ledet REST-API.",
        },
      ],
      ["TypeScript", "REST-API"],
      false,
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.gaps[0]?.suggestion).toBeNull();
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 0 },
    ]);
  });

  it("finds another Missing keyword by an alias when given the vocabulary", async () => {
    const response = {
      gaps: [
        {
          ...rewordable("REST-API", "Jeg brukte Git."),
          suggestion: "Brukte Git og TS.",
        },
      ],
    };
    const vocabulary = {
      vocabularyVersion: "v1-00000000",
      terms: ["TypeScript"],
      aliases: { TypeScript: ["TS"] },
    };
    const analyse = (withVocabulary: boolean) =>
      analyseGaps(
        {
          inputs,
          missingTerms: ["REST-API", "TypeScript"],
          rewording: true,
          ...(withVocabulary ? { vocabulary } : {}),
        },
        CTX,
        { adapter: adapterOf(() => response), testMode: true },
      );
    const without = await analyse(false);
    const withIt = await analyse(true);
    if (!without.ok || !withIt.ok) throw new Error("expected ok");
    expect(without.value.gaps[0]?.suggestion).toBe("Brukte Git og TS.");
    expect(withIt.value.gaps[0]?.suggestion).toBeNull();
  });
});

// Planted Cached responses (SC3, P1): raw `AiOutput` files that only tests read.
// The CV and the ad are the Example pair Fixture.
const pair = {
  cvText: readFileSync("data/fixtures/example-nordic-digital/cv.txt", "utf8"),
  jobAd: readFileSync("data/fixtures/example-nordic-digital/ad.txt", "utf8"),
  jobTitle: "Junior frontendutvikler",
  employer: "Nordic Digital",
};
const PAIR_MISSING = [
  "TypeScript",
  "REST-API",
  "pull requests",
  "testing",
  "responsive nettsider",
];

async function runPlanted(file: string) {
  const planted = JSON.parse(
    readFileSync(`data/fixtures/_planted/${file}.json`, "utf8"),
  ) as { data: unknown };
  const result = await analyseGaps(
    { inputs: pair, missingTerms: PAIR_MISSING },
    CTX,
    { adapter: adapterOf(() => planted.data), testMode: true },
  );
  if (!result.ok) throw new Error("expected ok");
  return result.value.gaps;
}

describe("FR-15 planted Cached responses", () => {
  beforeEach(() => vi.mocked(log).mockClear());

  const downgraded: [string, string, string][] = [
    ["a paraphrased citation", "gaps-citation-paraphrased", "pull requests"],
    [
      "a citation from the ad instead of the CV",
      "gaps-citation-from-ad",
      "pull requests",
    ],
    [
      "a citation with one changed word",
      "gaps-citation-one-word-changed",
      "testing",
    ],
  ];
  it.each(downgraded)("downgrades %s", async (_name, file, keyword) => {
    const raw = JSON.parse(
      readFileSync(`data/fixtures/_planted/${file}.json`, "utf8"),
    ) as { data: { gaps: AiGapItem[] } };
    // The planted answer really does claim Rewordable, with a citation.
    const planted = raw.data.gaps.find((item) => item.keyword === keyword);
    expect(planted?.kind).toBe("rewordable");
    expect(planted?.citation).toBeTruthy();
    // The plant stays a plant: a citation from the ad really is in the ad and
    // not in the CV, and none of the three is in the CV word for word.
    const citation = canonVerbatim(planted?.citation ?? "");
    expect(canonVerbatim(pair.cvText)).not.toContain(citation);
    if (file === "gaps-citation-from-ad") {
      expect(canonVerbatim(pair.jobAd)).toContain(citation);
    }

    const gaps = await runPlanted(file);
    expect(gaps).toHaveLength(PAIR_MISSING.length);
    expect(gaps.find((gap) => gap.keyword === keyword)).toEqual(
      template(keyword),
    );
    expect(gaps.every((gap) => gap.kind === "real")).toBe(true);
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 1, discarded: 0 },
    ]);
  });

  it("passes an exact citation in other case and with other line breaks", async () => {
    const gaps = await runPlanted("gaps-citation-exact-case-and-line-breaks");
    const gap = gaps.find((item) => item.keyword === "responsive nettsider");
    expect(gap?.kind).toBe("rewordable");
    expect(gap?.citation).toBe(
      "BYGDE EN nettside\nSOM   tilpasser seg\n mobilskjermer.",
    );
    expect(gap?.explanation).toHaveProperty("text");
    // The plant really is in the CV, only in other case and line breaks.
    expect(pair.cvText).not.toContain(gap?.citation ?? "");
    expect(canonVerbatim(pair.cvText)).toContain(
      canonVerbatim(gap?.citation ?? ""),
    );
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 0 },
    ]);
  });
});

// Planted FR-17 responses: the nursing Fixture's exam-paper entry (Story 5.2).
describe("FR-17 planted Cached responses", () => {
  beforeEach(() => vi.mocked(log).mockClear());

  const nursing = {
    cvText: readFileSync("data/fixtures/nursing-sarvurdering/cv.txt", "utf8"),
    jobAd: readFileSync("data/fixtures/nursing-sarvurdering/ad.txt", "utf8"),
    jobTitle: "Sykepleier",
    employer: "Fjordheimen",
  };
  const NURSING_MISSING = (
    JSON.parse(
      readFileSync(
        "data/fixtures/nursing-sarvurdering/answer-key.json",
        "utf8",
      ),
    ) as { keywords: { missing: string[] } }
  ).keywords.missing;

  async function runNursing(file: string) {
    const planted = JSON.parse(
      readFileSync(`data/fixtures/_planted/${file}.json`, "utf8"),
    ) as { data: { gaps: AiGapItem[] } };
    const result = await analyseGaps(
      { inputs: nursing, missingTerms: NURSING_MISSING, rewording: true },
      CTX,
      { adapter: adapterOf(() => planted.data), testMode: true },
    );
    if (!result.ok) throw new Error("expected ok");
    return { planted: planted.data.gaps, gaps: result.value.gaps };
  }

  it("discards «Forsket på sårvurdering» for the exam-paper entry; citation and explanation stay", async () => {
    const { planted, gaps } = await runNursing(
      "gaps-fr17-upgrade-exam-paper-as-research",
    );
    const item = planted.find((entry) => entry.keyword === "sårvurdering");
    expect(item?.suggestion).toBe("Forsket på sårvurdering");
    expect(item?.kind).toBe("rewordable");
    // The plant stays a plant: the citation really is in the CV.
    expect(canonVerbatim(nursing.cvText)).toContain(
      canonVerbatim(item?.citation ?? ""),
    );
    const gap = gaps.find((entry) => entry.keyword === "sårvurdering");
    expect(gap).toMatchObject({
      kind: "rewordable",
      citation: item?.citation,
      explanation: { text: item?.explanation },
      suggestion: null,
    });
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 1 },
    ]);
  });

  it("keeps «Kompetanse i sårvurdering»", async () => {
    const { gaps } = await runNursing("gaps-fr17-kept-no-upgrade");
    expect(gaps.find((gap) => gap.keyword === "sårvurdering")?.suggestion).toBe(
      "Kompetanse i sårvurdering",
    );
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 0 },
    ]);
  });

  it("discards a suggestion that names another Missing keyword", async () => {
    const { planted, gaps } = await runNursing(
      "gaps-fr17-names-other-missing-keyword",
    );
    const item = planted.find(
      (entry) => entry.keyword === "legemiddelhåndtering",
    );
    expect(item?.suggestion).toContain("smertelindring");
    expect(NURSING_MISSING).toContain("smertelindring");
    const gap = gaps.find((entry) => entry.keyword === "legemiddelhåndtering");
    expect(gap?.kind).toBe("rewordable");
    expect(gap?.citation).toBe(item?.citation);
    expect(gap?.suggestion).toBeNull();
    expect(gapsEvents()).toEqual([
      { kind: "gaps", downgraded: 0, discarded: 1 },
    ]);
  });
});
