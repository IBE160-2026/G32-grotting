import { describe, expect, it, vi } from "vitest";
import { REAL_GAP_KEY } from "../contracts";
import { type AiGapItem, analyseGaps, structureGaps } from "./analyse";

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

  it("sets every suggestion to null, also when the AI wrote one", () => {
    const withSuggestion = (item: AiGapItem, suggestion: string) =>
      ({ ...item, suggestion }) as AiGapItem;
    const gaps = structureGaps(missing, [
      withSuggestion(rewordable("TypeScript"), "Skriv dette."),
      withSuggestion(real("REST-API"), "Og dette."),
    ]);
    expect(gaps.every((gap) => gap.suggestion === null)).toBe(true);
  });
});

type Adapter = NonNullable<
  NonNullable<Parameters<typeof analyseGaps>[2]>["adapter"]
>;

const inputs = {
  cvText: `${"Erfaring med Python og SQL i tre år. ".repeat(8)}\nola@example.no`,
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
      promptVersion: "gaps-1",
    });
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
