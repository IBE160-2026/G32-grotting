import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeStrip } from "./code-strip";
import { CreditsList } from "./credits-list";
import { EvidenceQuote } from "./evidence-quote";

describe("UX-DR12 code strip", () => {
  it("is real text on its colour, with an outline kind", () => {
    const found = renderToStaticMarkup(
      CodeStrip({ kind: "found", children: "Funnet" }),
    );
    expect(found).toContain(">Funnet</span>");
    expect(found).toContain("bg-moss");
    expect(
      renderToStaticMarkup(CodeStrip({ kind: "missing", children: "Mangler" })),
    ).toContain("bg-rust");
    const outline = renderToStaticMarkup(
      CodeStrip({ kind: "outline", children: "Bør forbedres" }),
    );
    expect(outline).toContain("border-edge");
    expect(outline).not.toContain("bg-moss");
  });
});

describe("UX-DR14 credits list", () => {
  it("is a dl with a term and a value per row", () => {
    const html = renderToStaticMarkup(
      createElement(CreditsList, {
        items: [
          { term: "Stilling", value: "Junior frontendutvikler" },
          { term: "Annonse", value: "14 avsnitt · 7 nøkkelord" },
        ],
      }),
    );
    expect(html).toMatch(/^<dl /);
    expect(html).toContain("<dt");
    expect(html).toContain(">Stilling</dt>");
    expect(html).toContain(">14 avsnitt · 7 nøkkelord</dd>");
  });

  it("stacks the rows, divided by the rule colour, on Konto (UX-DR18)", () => {
    const html = renderToStaticMarkup(
      createElement(CreditsList, {
        stacked: true,
        items: [
          { term: "E-post", value: "kari@example.test" },
          { term: "Katalog", value: "2 søknader" },
        ],
      }),
    );
    expect(html).not.toContain("flex-wrap");
    expect(html.match(/border-rule/g)).toHaveLength(2);
    expect(html).toContain(">E-post</dt>");
    expect(html).toContain(">2 søknader</dd>");
  });
});

describe("UX-DR14 evidence quote", () => {
  it("quotes in sjevroner with the Keyword marked and a source line", () => {
    const html = renderToStaticMarkup(
      createElement(EvidenceQuote, {
        text: "Jeg bruker React daglig",
        mark: { start: 11, end: 16 },
        source: "Bevis · CV-linje 8 · annonsen avsnitt 03",
      }),
    );
    expect(html).toContain("«Jeg bruker <mark");
    expect(html).toContain(">React</mark> daglig»");
    expect(html).toContain("Bevis · CV-linje 8 · annonsen avsnitt 03");
  });

  it("shows a quote without a mark as plain text", () => {
    const html = renderToStaticMarkup(
      createElement(EvidenceQuote, {
        text: "Vi søker en utvikler",
        source: "x",
      }),
    );
    expect(html).not.toContain("<mark");
    expect(html).toContain("«Vi søker en utvikler»");
  });

  it("trims a long quote at a word boundary and keeps the mark", () => {
    const text = `${"ord ".repeat(60)}React ${"ord ".repeat(60)}`;
    const start = text.indexOf("React");
    const html = renderToStaticMarkup(
      createElement(EvidenceQuote, {
        text,
        mark: { start, end: start + 5 },
        source: "x",
      }),
    );
    expect(html).toContain("«…");
    expect(html).toContain("…»");
    expect(html).toContain(">React</mark>");
  });
});
