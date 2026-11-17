import { describe, expect, it } from "vitest";
import { QUOTE_MAX, trimQuote } from "./trim-quote";

const WORDS = "alfa beta gamma delta epsilon zeta eta theta iota kappa ".repeat(
  8,
);

function marked(quote: ReturnType<typeof trimQuote>): string | undefined {
  return quote.mark && quote.text.slice(quote.mark.start, quote.mark.end);
}

describe("UX-DR14 trimQuote", () => {
  it("leaves a quote of up to 160 characters as it is", () => {
    const text = "x".repeat(QUOTE_MAX);
    const mark = { start: 2, end: 5 };
    expect(trimQuote(text, mark)).toEqual({ text, mark });
  });

  it("cuts a longer quote at word boundaries with «…» at the cut ends", () => {
    const start = WORDS.indexOf("epsilon", 200);
    const mark = { start, end: start + "epsilon".length };
    const quote = trimQuote(WORDS, mark);
    expect(quote.text.startsWith("…")).toBe(true);
    expect(quote.text.endsWith("…")).toBe(true);
    expect(quote.text.length).toBeLessThanOrEqual(QUOTE_MAX + 2);
    const inner = quote.text.slice(1, -1);
    expect(WORDS.includes(inner)).toBe(true);
    // Whole words only: the cut never lands inside one.
    for (const word of inner.split(" ")) {
      expect(WORDS.split(" ")).toContain(word);
    }
  });

  it("keeps the marked Keyword in view, wherever it sits", () => {
    for (const keyword of ["alfa", "epsilon", "kappa"]) {
      for (const from of [0, 120, 300, WORDS.length - 20]) {
        const start = WORDS.indexOf(keyword, from);
        if (start === -1) continue;
        const quote = trimQuote(WORDS, {
          start,
          end: start + keyword.length,
        });
        expect(marked(quote)).toBe(keyword);
      }
    }
  });

  it("puts «…» only at the end that was cut", () => {
    const first = trimQuote(WORDS, { start: 0, end: 4 });
    expect(first.text.startsWith("…")).toBe(false);
    expect(first.text.endsWith("…")).toBe(true);
    expect(marked(first)).toBe("alfa");

    const text = WORDS.trimEnd();
    const start = text.lastIndexOf("kappa");
    const last = trimQuote(text, { start, end: start + 5 });
    expect(last.text.startsWith("…")).toBe(true);
    expect(last.text.endsWith("…")).toBe(false);
    expect(marked(last)).toBe("kappa");
  });

  it("trims a long quote without a mark from its start", () => {
    const quote = trimQuote(WORDS, undefined);
    expect(quote.mark).toBeUndefined();
    expect(quote.text.startsWith("alfa")).toBe(true);
    expect(quote.text.endsWith("…")).toBe(true);
  });

  it("cuts a long run with no space hard instead of leaving only «…»", () => {
    const quote = trimQuote("x".repeat(400), undefined);
    expect(quote.text.length).toBeGreaterThan(QUOTE_MAX / 2);
    expect(quote.text).not.toBe("…");
  });

  it("keeps a mark longer than the limit whole", () => {
    const text = `${"a ".repeat(50)}${"M".repeat(200)} ${"b ".repeat(50)}`;
    const quote = trimQuote(text, { start: 100, end: 300 });
    expect(marked(quote)).toBe("M".repeat(200));
  });

  it("is pure: the same input gives the same output", () => {
    const mark = { start: 100, end: 105 };
    expect(trimQuote(WORDS, mark)).toEqual(trimQuote(WORDS, mark));
  });
});
