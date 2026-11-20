import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Letter, LetterFlagWire } from "../contracts";
import { LetterView } from "./index";
import type { LetterCheckState } from "./letter-flags";

const letter: Letter = {
  text: "Hei Nordic Digital,\n\nJeg kan TypeScript og ledet gruppen.\n\nMed hilsen\n{{SIGNATUR}}",
  tone: "Formell",
  rev: 1,
};

const at = (word: string) => {
  const start = letter.text.indexOf(word);
  return { start, end: start + word.length };
};

const flags: LetterFlagWire[] = [
  {
    kind: "UNSUPPORTED_CLAIM",
    term: "TypeScript",
    word: "TypeScript",
    spans: [at("TypeScript")],
  },
  { kind: "UPGRADE_WORD", term: "ledet", word: "ledet", spans: [at("ledet")] },
];

const text = (html: string) => html.replace(/<[^>]*>/g, "");

const render = (check?: LetterCheckState) =>
  renderToStaticMarkup(
    createElement(LetterView, { letter, check, onRetryCheck: () => {} }),
  );

describe("FR-11 flags on the Letter", () => {
  const html = render({ kind: "done", flags });

  it("puts a named warning list between the AI label and the Letter, one line per word", () => {
    expect(html.indexOf('id="letter-ai-label"')).toBeLessThan(
      html.indexOf("<section"),
    );
    expect(html.indexOf("</section>")).toBeLessThan(html.indexOf("<article"));
    expect(html).toContain('aria-label="Sjekk av brevet mot CV-en"');
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).toContain(
      "Brevet nevner «TypeScript», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.",
    );
    expect(html).toContain(
      "Brevet bruker ordet «ledet», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.",
    );
  });

  it("is no alert and no live region, and its strip is not «Feil»", () => {
    expect(html).not.toMatch(/role="alert"|aria-live/);
    expect(html).not.toContain("Feil");
    expect(html).toContain("Sjekk</span>");
  });

  it("underlines each flagged word in the Letter and links it to its line", () => {
    const article = html.slice(html.indexOf("<article"));
    expect(article).toMatch(/<a href="#letter-flag-0"[^>]*>TypeScript<\/a>/);
    expect(article).toMatch(/<a href="#letter-flag-1"[^>]*>ledet<\/a>/);
    expect(article).toContain("decoration-dashed");
    expect(article).toContain("decoration-rust");
    expect(article).toContain("decoration-2");
    expect(article).toContain("underline-offset-4");
    expect(html).toMatch(/<li id="letter-flag-0" tabindex="-1">/);
    expect(html).toMatch(/<li id="letter-flag-1" tabindex="-1">/);
  });

  it("removes nothing: the Letter text is the same with and without flags", () => {
    const article = (value: string) =>
      text(value.slice(value.indexOf("<article")));
    expect(article(html)).toBe(article(render()));
    expect(article(html)).toContain("Jeg kan TypeScript og ledet gruppen.");
  });

  it("shows no list for a clean Letter or while the check is pending", () => {
    for (const check of [
      { kind: "done", flags: [] },
      { kind: "pending" },
    ] as const) {
      const clean = render(check);
      expect(clean).not.toContain("<section");
      expect(clean).not.toContain("<a ");
      expect(clean).not.toContain("Brevet er ikke sjekket");
    }
  });
});

describe("FR-11 a failed check", () => {
  it("keeps the Letter, shows the notice and a check-only retry, never an alert", () => {
    const html = render({ kind: "failed", busy: false });
    expect(text(html)).toContain(
      "Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.",
    );
    expect(text(html)).toContain("Sjekk igjen");
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("<article");
    expect(html.indexOf("Sjekk igjen")).toBeLessThan(html.indexOf("<article"));
  });

  it("marks the retry busy while it runs", () => {
    const html = render({ kind: "failed", busy: true });
    expect(html).toContain('aria-disabled="true"');
  });
});
