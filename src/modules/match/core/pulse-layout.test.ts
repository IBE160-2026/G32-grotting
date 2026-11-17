import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractKeywords, splitParagraphs } from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { analyse } from "./analyse";
import {
  estimateMeasure,
  layoutPulsePlot,
  type PlotLabel,
  type PlotLayout,
  type PlotMode,
  plotModeFor,
} from "./pulse-layout";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const ad = readFileSync(`${dir}/ad.txt`, "utf8");
const cv = readFileSync(`${dir}/cv.txt`, "utf8");
const paragraphs = splitParagraphs(ad);
const extracted = extractKeywords(ad, vocabulary);
if (!extracted.ok) throw new Error(extracted.error);
const { matched, missing } = analyse(cv, extracted.value, vocabulary, {
  keywordSource: "code",
  adParagraphs: paragraphs.length,
});

const stateText = { matched: "FUNNET", missing: "MANGLER" } as const;

function lay(mode: PlotMode, measure = estimateMeasure) {
  return layoutPulsePlot({
    paragraphs,
    matched,
    missing,
    mode,
    measure,
    stateText,
  });
}

const MODES: PlotMode[] = ["full", "home", "compact", "flat"];

// The y values of every point of a line's paths.
function ys(layout: PlotLayout, line: number): number[] {
  return layout.lines[line].segments.flatMap((s) =>
    Array.from(s.d.matchAll(/[ML][\d.]+ ([\d.]+)/g), (m) => Number(m[1])),
  );
}

function xs(layout: PlotLayout, line: number): number[] {
  return layout.lines[line].segments.flatMap((s) =>
    Array.from(s.d.matchAll(/[ML]([\d.]+) /g), (m) => Number(m[1])),
  );
}

describe("FR-8 pulse layout geometry", () => {
  it.each(MODES)(
    "gives identical geometry for the same input in %s",
    (mode) => {
      expect(lay(mode)).toEqual(lay(mode));
      expect(JSON.stringify(lay(mode))).toBe(JSON.stringify(lay(mode)));
    },
  );

  it("draws a baseline per paragraph, 23 px apart (21 on Hjem)", () => {
    const full = lay("full");
    expect(full.lines).toHaveLength(paragraphs.length);
    const gaps = full.lines
      .slice(1)
      .map((l, i) => l.baseline - full.lines[i].baseline);
    expect(new Set(gaps)).toEqual(new Set([23]));
    const home = lay("home");
    const homeGaps = home.lines
      .slice(1)
      .map((l, i) => l.baseline - home.lines[i].baseline);
    expect(new Set(homeGaps)).toEqual(new Set([21]));
  });

  it("numbers the paragraphs 01, 02 ... down the left", () => {
    const { lines } = lay("full");
    expect(lines[0].index).toBe("01");
    expect(lines[lines.length - 1].index).toBe(
      String(paragraphs.length).padStart(2, "0"),
    );
  });

  it("derives the ripple from the paragraph's characters", () => {
    const base = {
      matched: [],
      missing: [],
      mode: "flat" as const,
      measure: estimateMeasure,
      stateText,
    };
    const a = layoutPulsePlot({
      ...base,
      paragraphs: ["Alfa beta gamma delta"],
    });
    const b = layoutPulsePlot({
      ...base,
      paragraphs: ["Alfa beta gamma delta"],
    });
    const c = layoutPulsePlot({
      ...base,
      paragraphs: ["Helt annen tekst her nå"],
    });
    expect(a.lines[0].segments).toEqual(b.lines[0].segments);
    expect(a.lines[0].segments).not.toEqual(c.lines[0].segments);
  });

  it("raises a peak 62 px high (54 on Hjem) at a Keyword", () => {
    const text = "x".repeat(100);
    const term = {
      term: "React",
      positions: [{ paragraph: 0, start: 50, end: 55 }],
    };
    for (const [mode, height] of [
      ["full", 62],
      ["home", 54],
    ] as const) {
      const base = {
        paragraphs: [text],
        missing: [],
        mode,
        measure: estimateMeasure,
        stateText,
      };
      const withKeyword = layoutPulsePlot({ ...base, matched: [term] });
      const without = layoutPulsePlot({ ...base, matched: [] });
      const rise =
        Math.min(...ys(without, 0)) - Math.min(...ys(withKeyword, 0));
      expect(rise).toBeGreaterThan(height);
      expect(rise).toBeLessThan(height * 1.7);
    }
  });

  it("puts the peak at start over paragraph length", () => {
    const text = "x".repeat(100);
    const at = (start: number) =>
      layoutPulsePlot({
        paragraphs: [text],
        matched: [
          { term: "A", positions: [{ paragraph: 0, start, end: start + 1 }] },
        ],
        missing: [],
        mode: "full",
        measure: estimateMeasure,
        stateText,
      }).labels[0].square.x;
    expect(at(25)).toBeLessThan(at(60));
    // 40 + 0.5 * 950 = 515; the label stands 12 px to the right of the peak.
    expect(at(50)).toBe(515 + 12);
  });

  it("uses the first position in a paragraph", () => {
    const text = "x".repeat(100);
    const layout = layoutPulsePlot({
      paragraphs: [text],
      matched: [
        {
          term: "A",
          positions: [
            { paragraph: 0, start: 80, end: 81 },
            { paragraph: 0, start: 50, end: 51 },
          ],
        },
      ],
      missing: [],
      mode: "full",
      measure: estimateMeasure,
      stateText,
    });
    expect(layout.labels).toHaveLength(1);
    expect(layout.labels[0].square.x).toBe(515 + 12);
  });

  it("draws Matched thick, Missing dashed and neutral thin", () => {
    const full = lay("full");
    expect(full.stroke).toEqual({
      neutral: 1.15,
      matched: 2.8,
      missing: 1.5,
      dash: "3.5 3",
    });
    const kinds = new Set(
      full.lines.flatMap((l) => l.segments.map((s) => s.kind)),
    );
    expect(kinds).toEqual(new Set(["neutral", "matched", "missing"]));
    expect(lay("compact").stroke.dash).toBe("3 2.5");
  });

  it("labels every Keyword once per paragraph it sits in", () => {
    const all = [...matched, ...missing];
    const expected = all.reduce(
      (sum, k) => sum + new Set(k.positions.map((p) => p.paragraph)).size,
      0,
    );
    for (const mode of ["full", "home", "compact"] as const) {
      const layout = lay(mode);
      expect(layout.labels).toHaveLength(expected);
      for (const entry of matched) {
        expect(
          layout.labels.some(
            (l) => l.term === entry.term && l.state === "matched",
          ),
        ).toBe(true);
      }
      for (const entry of missing) {
        expect(
          layout.labels.some(
            (l) => l.term === entry.term && l.state === "missing",
          ),
        ).toBe(true);
      }
    }
  });
});

describe("FR-8 pulse layout flat", () => {
  it("draws baselines only: no labels, no peaks", () => {
    const flat = lay("flat");
    expect(flat.labels).toEqual([]);
    expect(flat.lines).toHaveLength(paragraphs.length);
    expect(
      flat.lines.every((l) => l.segments.every((s) => s.kind === "neutral")),
    ).toBe(true);
  });

  it("draws nothing for an ad with no paragraph", () => {
    const empty = layoutPulsePlot({
      paragraphs: [],
      matched: [],
      missing: [],
      mode: "flat",
      measure: estimateMeasure,
      stateText,
    });
    expect(empty.lines).toEqual([]);
    expect(empty.paragraphCount).toBe(0);
  });
});

describe("FR-8 pulse layout without Keywords", () => {
  it.each(["full", "home", "flat"] as const)(
    "draws baselines only in %s",
    (mode) => {
      const layout = layoutPulsePlot({
        paragraphs,
        matched: [],
        missing: [],
        mode,
        measure: estimateMeasure,
        stateText,
      });
      expect(layout.lines).toHaveLength(paragraphs.length);
      expect(layout.labels).toEqual([]);
    },
  );
});

function overlap(a: PlotLabel, b: PlotLabel): boolean {
  if (!a.plate || !b.plate) return false;
  return (
    a.plate.x < b.plate.x + b.plate.width &&
    a.plate.x + a.plate.width > b.plate.x &&
    a.plate.y < b.plate.y + b.plate.height &&
    a.plate.y + a.plate.height > b.plate.y
  );
}

function noneOverlap(labels: readonly PlotLabel[]) {
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      expect(overlap(labels[i], labels[j])).toBe(false);
    }
  }
}

describe("FR-8 pulse layout label collisions", () => {
  const crowded = {
    paragraphs: ["a".repeat(60), "b".repeat(60), "c".repeat(60)],
    matched: [
      { term: "React", positions: [{ paragraph: 1, start: 20, end: 25 }] },
      { term: "TypeScript", positions: [{ paragraph: 1, start: 22, end: 32 }] },
    ],
    missing: [
      { term: "Kubernetes", positions: [{ paragraph: 1, start: 24, end: 34 }] },
    ],
    stateText,
    measure: estimateMeasure,
  };

  it.each(["full", "home"] as const)(
    "keeps floating labels apart in %s",
    (mode) => {
      const { labels } = layoutPulsePlot({ ...crowded, mode });
      expect(labels).toHaveLength(3);
      noneOverlap(labels);
    },
  );

  it("keeps floating labels apart on the example ad", () => {
    noneOverlap(lay("full").labels);
    noneOverlap(lay("home").labels);
  });

  it.each(["full", "home"] as const)(
    "keeps every label plate within the height when many Keywords sit in the last paragraph in %s",
    (mode) => {
      const terms = Array.from({ length: 14 }, (_, i) => ({
        term: `Nøkkelord ${i + 1}`,
        positions: [{ paragraph: 2, start: 10 + i * 3, end: 15 + i * 3 }],
      }));
      const layout = layoutPulsePlot({
        paragraphs: ["a".repeat(100), "b".repeat(100), "c".repeat(100)],
        matched: terms.slice(0, 7),
        missing: terms.slice(7),
        mode,
        measure: estimateMeasure,
        stateText,
      });
      expect(layout.labels).toHaveLength(14);
      for (const { plate } of layout.labels) {
        expect(plate).toBeDefined();
        expect((plate?.y ?? -1) + (plate?.height ?? 0)).toBeLessThanOrEqual(
          layout.height,
        );
        expect(plate?.y).toBeGreaterThanOrEqual(0);
      }
      noneOverlap(layout.labels);
    },
  );

  it("stacks compact labels in separate rows, whatever the font", () => {
    const wide = (t: string, px: number) => t.length * px * 1.4;
    for (const measure of [estimateMeasure, wide]) {
      const layout = layoutPulsePlot({ ...crowded, mode: "compact", measure });
      const rows = layout.labels.map((l) => l.termY);
      expect(new Set(rows).size).toBe(rows.length);
      const sorted = [...rows].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(32);
      }
    }
  });

  it("stacks compact labels of the example without overlap", () => {
    const { labels, height } = lay("compact");
    const sorted = labels.map((l) => l.termY).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      // A label is a term line and a state line, 22 px tall.
      expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(22);
    }
    expect(sorted[0]).toBeGreaterThanOrEqual(9);
    expect(sorted[sorted.length - 1] + 13).toBeLessThanOrEqual(height);
  });
});

describe("FR-8 compact layout", () => {
  it("uses a 328 px viewBox and draws only paragraphs with Keywords", () => {
    const compact = lay("compact");
    expect(compact.width).toBe(328);
    const withKeywords = new Set(
      [...matched, ...missing].flatMap((k) =>
        k.positions.map((p) => p.paragraph),
      ),
    );
    expect(compact.drawnCount).toBe(withKeywords.size);
    expect(compact.lines.map((l) => l.paragraph)).toEqual(
      [...withKeywords].sort((a, b) => a - b),
    );
    expect(compact.paragraphCount).toBe(paragraphs.length);
  });

  it("ends the lines at x = 160 and puts labels in a column at x = 174", () => {
    const compact = lay("compact");
    for (let line = 0; line < compact.lines.length; line++) {
      expect(Math.max(...xs(compact, line))).toBe(160);
    }
    for (const label of compact.labels) {
      expect(label.square.x).toBe(174);
      expect(label.leader).toBeDefined();
      expect(label.plate).toBeUndefined();
    }
  });

  it("shrinks a long Keyword to fit the column", () => {
    const term = "Et veldig langt nøkkelord her";
    const measure = (t: string, px: number) => t.length * px * 0.6;
    const layout = layoutPulsePlot({
      paragraphs: ["a".repeat(40)],
      matched: [{ term, positions: [{ paragraph: 0, start: 5, end: 9 }] }],
      missing: [],
      mode: "compact",
      measure,
      stateText,
    });
    const [label] = layout.labels;
    expect(label.termFontSize).toBeLessThan(12);
    expect(label.textX + measure(term, label.termFontSize)).toBeLessThanOrEqual(
      328,
    );
  });

  it("ignores a position in a paragraph that does not exist", () => {
    const layout = layoutPulsePlot({
      paragraphs: ["a".repeat(40)],
      matched: [{ term: "X", positions: [{ paragraph: 5, start: 0, end: 1 }] }],
      missing: [],
      mode: "compact",
      measure: estimateMeasure,
      stateText,
    });
    expect(layout.labels).toEqual([]);
    expect(layout.drawnCount).toBe(0);
  });
});

describe("UX-DR22 plotModeFor", () => {
  it("is compact at 640 px and below, full above", () => {
    expect(plotModeFor(640, "result")).toBe("compact");
    expect(plotModeFor(641, "result")).toBe("full");
    expect(plotModeFor(320, "result")).toBe("compact");
    expect(plotModeFor(1184, "result")).toBe("full");
  });

  it("gives Hjem its own full variant and the form always flat", () => {
    expect(plotModeFor(900, "home")).toBe("home");
    expect(plotModeFor(400, "home")).toBe("compact");
    expect(plotModeFor(2000, "flat")).toBe("flat");
    expect(plotModeFor(100, "flat")).toBe("flat");
  });

  it("starts as the full variant when the width is not known", () => {
    expect(plotModeFor(Number.POSITIVE_INFINITY, "result")).toBe("full");
  });
});
