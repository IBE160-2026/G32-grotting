import { describe, expect, it } from "vitest";
import {
  estimateCost,
  formatUsd,
  GAP_ITEMS,
  LETTER_ITEMS,
  type RequestRecord,
  renderResults,
} from "./results";

describe("PRD 8.2 Bake-off cost", () => {
  it("prices tokens per million, per contender", () => {
    expect(
      estimateCost(
        { inputTokens: 2000, outputTokens: 500 },
        { inPerMillion: 3, outPerMillion: 15 },
      ),
    ).toBeCloseTo(0.0135, 10);
  });

  it("gives no estimate without a price or without token counts", () => {
    expect(
      estimateCost({ inputTokens: 1, outputTokens: 1 }, undefined),
    ).toBeNull();
    expect(
      estimateCost(
        { inputTokens: null, outputTokens: 1 },
        { inPerMillion: 1, outPerMillion: 1 },
      ),
    ).toBeNull();
    expect(formatUsd(null)).toBe("n/a");
    expect(formatUsd(0.0135)).toBe("$0.0135");
  });
});

const meta = {
  date: "2026-11-18",
  dry: false,
  contenders: [
    {
      provider: "openrouter:a/x",
      model: "m1",
      price: { inPerMillion: 3, outPerMillion: 15 },
    },
    { provider: "openrouter:b/y", model: "m2", price: undefined },
  ],
};

const base = {
  fixture: "fx",
  model: "m1",
  durationMs: 10,
} as const;

const records: RequestRecord[] = [
  {
    ...base,
    provider: "openrouter:a/x",
    task: "letter",
    status: "ok",
    file: "openrouter-a-x/fx.letter.txt",
    words: 310,
    inputTokens: 1000,
    outputTokens: 400,
  },
  {
    ...base,
    provider: "openrouter:a/x",
    task: "gap",
    status: "ok",
    file: "openrouter-a-x/fx.gap.json",
    inputTokens: 1000,
    outputTokens: 200,
  },
  {
    ...base,
    provider: "openrouter:b/y",
    task: "letter",
    status: "failed",
    errorCode: "HTTP_429",
    inputTokens: null,
    outputTokens: null,
  },
  {
    ...base,
    provider: "openrouter:b/y",
    task: "gap",
    status: "ok",
    file: "openrouter-b-y/fx.gap.json",
    inputTokens: 900,
    outputTokens: 100,
  },
];

describe("PRD 8.2 results.md", () => {
  const text = renderResults(meta, records);

  it("lists every Fixture with both contenders", () => {
    expect(text).toContain("### openrouter:a/x: Letter");
    expect(text).toContain("### openrouter:a/x: Gap analysis");
    expect(text).toContain("### openrouter:b/y: Letter");
    expect(text).toContain("### openrouter:b/y: Gap analysis");
    expect(text).toContain("| fx | openrouter:a/x | 2000 | 600 | $0.0150 |");
  });

  it("has blank pass/fail cells for L1-L8, G1-G3 and R1", () => {
    for (const [id] of [...LETTER_ITEMS, ...GAP_ITEMS]) {
      expect(text).toMatch(new RegExp(`\\| ${id} \\|[^|]+\\| \\|`));
    }
    expect(LETTER_ITEMS.map(([id]) => id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "L7",
      "L8",
    ]);
    expect(GAP_ITEMS.map(([id]) => id)).toEqual(["G1", "G2", "G3", "R1"]);
  });

  it("records a failed request by its error code, with no scoring table", () => {
    const failed = text.slice(text.indexOf("### openrouter:b/y: Letter"));
    const section = failed.slice(
      0,
      failed.indexOf("### openrouter:b/y: Gap analysis"),
    );
    expect(section).toContain("`HTTP_429`");
    expect(section).not.toContain("| L1 |");
    expect(text).toContain(
      "| fx | openrouter:b/y | n/a | n/a | n/a (a request failed) |",
    );
  });

  it("keeps working for any number of contenders, labelled by id", () => {
    const ids = [
      "openrouter:a/x",
      "openrouter:b/y",
      "openrouter:c/z",
      "openrouter:d/w",
    ];
    const many = renderResults(
      {
        date: "2026-11-18",
        dry: false,
        contenders: ids.map((provider, i) => ({
          provider,
          model: `m${i}`,
          price: i === 0 ? { inPerMillion: 2, outPerMillion: 8 } : undefined,
        })),
      },
      ids.flatMap((provider): RequestRecord[] => [
        {
          ...base,
          provider,
          task: "letter",
          status: "ok",
          file: "f/fx.letter.txt",
          words: 300,
          inputTokens: 1_000_000,
          outputTokens: 0,
        },
        {
          ...base,
          provider,
          task: "gap",
          status: "ok",
          file: "f/fx.gap.json",
          inputTokens: 0,
          outputTokens: 0,
        },
      ]),
    );
    for (const id of ids) {
      expect(many).toContain(`### ${id}: Letter`);
      expect(many).toContain(`### ${id}: Gap analysis`);
    }
    expect(many).toContain("| openrouter:a/x | m0 | 2 | 8 |");
    expect(many).toContain("| fx | openrouter:a/x | 1000000 | 0 | $2.0000 |");
    expect(many).toContain("| fx | openrouter:b/y | 1000000 | 0 | n/a |");
  });

  it("says so when the run was dry", () => {
    expect(renderResults({ ...meta, dry: true }, records)).toContain(
      "**Dry run:**",
    );
    expect(text).not.toContain("**Dry run:**");
  });
});
