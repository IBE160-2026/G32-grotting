import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  normalise,
  splitParagraphs,
} from "@/modules/keywords/core";
import { answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { analyse } from "../core/analyse";
import { estimateMeasure, type PlotMode } from "../core/pulse-layout";
import { PulsePlot } from "./index";
import { PulsePlotView } from "./pulse-plot";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const key = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
const ad = readFileSync(`${dir}/ad.txt`, "utf8");
const cv = readFileSync(`${dir}/cv.txt`, "utf8");
const paragraphs = splitParagraphs(ad);
const extracted = extractKeywords(ad, vocabulary);
if (!extracted.ok) throw new Error(extracted.error);
const result = analyse(cv, extracted.value, vocabulary, {
  keywordSource: "code",
  adParagraphs: paragraphs.length,
});

const text = (html: string) => html.replace(/<[^>]*>/g, "");

function render(
  placement: "result" | "home" | "flat",
  overrides: Partial<{
    paragraphs: string[];
    matched: typeof result.matched;
    missing: typeof result.missing;
  }> = {},
) {
  return renderToStaticMarkup(
    createElement(PulsePlot, {
      paragraphs,
      matched: result.matched,
      missing: result.missing,
      placement,
      ...overrides,
    }),
  );
}

function renderMode(mode: PlotMode) {
  return renderToStaticMarkup(
    createElement(PulsePlotView, {
      paragraphs,
      matched: result.matched,
      missing: result.missing,
      mode,
      measure: estimateMeasure,
    }),
  );
}

function attribute(html: string, name: string): string | undefined {
  return html.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

describe("FR-8 pulse plot, full", () => {
  const html = render("result");

  it("is a figure with role img and a label built from the data", () => {
    expect(html).toMatch(/<figure[^>]*role="img"/);
    const label = attribute(html, "aria-label");
    const total = paragraphs.length;
    const found = result.matched.map((k) => k.term).join(", ");
    const lacking = result.missing.map((k) => k.term).join(", ");
    expect(label).toBe(
      `${total} avsnitt i annonsen tegnet som puls. Funnet i CV-en: ${found}. Mangler: ${lacking}.`,
    );
  });

  it("has Matched and Missing terms equal to the Answer key", () => {
    const norm = (terms: readonly string[]) => terms.map(normalise).sort();
    expect(norm(result.matched.map((k) => k.term))).toEqual(
      norm(key.keywords.matched),
    );
    expect(norm(result.missing.map((k) => k.term))).toEqual(
      norm(key.keywords.missing),
    );
    const label = attribute(html, "aria-label") ?? "";
    for (const entry of [...result.matched, ...result.missing]) {
      expect(label).toContain(entry.term);
    }
  });

  it("draws the viewBox of the full variant and no figcaption", () => {
    expect(html).toMatch(/viewBox="0 0 1160 \d+"/);
    expect(html).not.toContain("<figcaption");
  });

  it("labels each peak with a code-colour square, the term and the state", () => {
    expect(html.match(/FUNNET/g)).toHaveLength(
      result.matched.reduce(
        (sum, k) => sum + new Set(k.positions.map((p) => p.paragraph)).size,
        0,
      ),
    );
    expect(html).toContain(">MANGLER<");
    expect(html).toContain("fill-moss");
    expect(html).toContain("fill-rust");
  });

  it("draws thick, dashed and thin lines and the paragraph numbers", () => {
    expect(html).toContain('stroke-width="2.8"');
    expect(html).toContain('stroke-dasharray="3.5 3"');
    expect(html).toContain('stroke-width="1.15"');
    expect(html).toContain(">01<");
    expect(html).toContain(`>${String(paragraphs.length).padStart(2, "0")}<`);
  });

  it("explains the three line kinds in a legend", () => {
    const words = text(html);
    expect(words).toContain("Tykk linje: nøkkelord funnet i CV-en");
    expect(words).toContain("Stiplet linje: nøkkelord som mangler");
    expect(words).toContain("Tynn linje: ett avsnitt i annonsen");
  });

  it("has no title, tooltip, link, button or focusable part", () => {
    expect(html).not.toContain("<title");
    expect(html).not.toContain("tabindex");
    expect(html).not.toMatch(/<(a|button|input)\b/);
    expect(html).not.toContain("onclick");
  });

  it("draws the same markup twice", () => {
    expect(render("result")).toBe(html);
  });
});

describe("FR-8 pulse plot, Hjem", () => {
  it("is the home variant with a 620 px viewBox, a label and a legend", () => {
    const html = render("home");
    expect(html).toMatch(/viewBox="0 0 620 \d+"/);
    expect(html).toMatch(/<figure[^>]*role="img"/);
    expect(text(html)).toContain("Tykk linje");
  });
});

describe("FR-8 pulse plot, compact", () => {
  const html = renderMode("compact");
  const withKeywords = new Set(
    [...result.matched, ...result.missing].flatMap((k) =>
      k.positions.map((p) => p.paragraph),
    ),
  );

  it("uses viewBox 0 0 328 and full width", () => {
    expect(html).toMatch(/viewBox="0 0 328 \d+"/);
    expect(html).toContain("w-full");
  });

  it("says in the figcaption what is left out, with counts from the data", () => {
    const caption = html.match(/<figcaption[^>]*>(.*?)<\/figcaption>/)?.[1];
    expect(caption).toBe(
      `Viser de ${withKeywords.size} av ${paragraphs.length} avsnittene som har nøkkelord. Tallet til venstre er avsnittet.`,
    );
  });

  it("starts the label with the shown paragraphs out of all", () => {
    expect(attribute(html, "aria-label")).toMatch(
      new RegExp(
        `^${withKeywords.size} av ${paragraphs.length} avsnitt i annonsen tegnet som puls. Funnet i CV-en: `,
      ),
    );
  });

  it("draws the legend with the compact line kinds", () => {
    const legend = html.slice(html.indexOf("<ul"));
    expect(legend).toContain('stroke-width="2.4"');
    expect(legend).toContain('stroke-dasharray="3 2.5"');
    expect(legend).not.toContain('stroke-width="2.8"');
    expect(legend).not.toContain('stroke-dasharray="3.5 3"');
    const full = renderMode("full");
    const fullLegend = full.slice(full.indexOf("<ul"));
    expect(fullLegend).toContain('stroke-width="2.8"');
    expect(fullLegend).toContain('stroke-dasharray="3.5 3"');
  });

  it("draws dotted leaders, only the paragraphs with Keywords, and the legend stacked", () => {
    expect(html).toContain('stroke-dasharray="1 2.5"');
    expect(html).toContain('stroke-dasharray="3 2.5"');
    expect(html).toContain('stroke-width="2.4"');
    const numbers = [...html.matchAll(/text-plot-index">(\d\d)</g)].map(
      (m) => Number(m[1]) - 1,
    );
    expect(numbers).toEqual([...withKeywords].sort((a, b) => a - b));
    expect(html).toMatch(/<ul class="[^"]*flex-col/);
  });
});

describe("FR-8 pulse plot, flat", () => {
  const html = render("flat", { matched: [], missing: [] });

  it("is aria-hidden, with no label, peaks, legend or figure", () => {
    expect(html).toContain('<div aria-hidden="true">');
    expect(html).not.toContain("role=");
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("<figure");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("FUNNET");
    expect(html).not.toContain("MANGLER");
    expect(html).toContain("stroke-plot-flat");
  });

  it("draws nothing when the ad has no paragraph", () => {
    expect(
      render("flat", { paragraphs: [], matched: [], missing: [] }),
    ).not.toContain("<svg");
  });

  it("draws one line per paragraph typed so far", () => {
    const two = render("flat", {
      paragraphs: ["Første avsnitt.", "Andre avsnitt."],
      matched: [],
      missing: [],
    });
    expect(two.match(/<path[^>]*stroke-plot-flat/g)?.length).toBeGreaterThan(1);
    expect(two).not.toContain(">01<");
  });
});

describe("FR-8 pulse plot, empty lists", () => {
  it("draws baselines only and leaves out the empty list's sentence", () => {
    const none = render("result", { matched: [], missing: [] });
    expect(none).not.toContain("FUNNET");
    expect(none).not.toContain("MANGLER");
    expect(attribute(none, "aria-label")).toBe(
      `${paragraphs.length} avsnitt i annonsen tegnet som puls.`,
    );
    const onlyMissing = render("result", { matched: [] });
    expect(attribute(onlyMissing, "aria-label")).not.toContain("Funnet");
    expect(attribute(onlyMissing, "aria-label")).toContain("Mangler: ");
    const onlyMatched = render("result", { missing: [] });
    expect(attribute(onlyMatched, "aria-label")).not.toContain("Mangler");
    expect(attribute(onlyMatched, "aria-label")).toContain("Funnet i CV-en: ");
  });
});
