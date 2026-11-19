import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import { type Letter, TONES } from "../contracts";
import { LetterSection, LetterView, letterLine, ToneChoice } from "./index";

const letter: Letter = {
  text: "Hei Nordic Digital,\n\nJeg søker.\n\nVennlig hilsen\n{{SIGNATUR}}",
  tone: "Personlig",
  rev: 1,
};

const text = (html: string) => html.replace(/<[^>]*>/g, "");

describe("FR-10 tone choice", () => {
  const html = renderToStaticMarkup(
    createElement(ToneChoice, { value: "Formell", onChange: () => {} }),
  );

  it("is one fieldset with the legend «Tone i brevet» and three radios in one group", () => {
    expect(html).toMatch(/^<fieldset/);
    expect(html).toMatch(/<legend[^>]*>Tone i brevet<\/legend>/);
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html.match(/name="tone"/g)).toHaveLength(3);
    for (const tone of TONES) expect(html).toContain(`value="${tone}"`);
  });

  it("preselects «Formell» and no other", () => {
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toMatch(
      /value="Formell"[^>]*checked=""|checked=""[^>]*value="Formell"/,
    );
  });

  it("makes the whole option the label, with the name and the hint as one accessible name", () => {
    const labels = html.match(/<label[\s\S]*?<\/label>/g) ?? [];
    expect(labels.map((label) => text(label))).toEqual([
      "Formell – Høflig og saklig",
      "Personlig – Varm, med «jeg» i front",
      "Direkte – Kort, rett på sak",
    ]);
    for (const label of labels) expect(label).toContain("<input");
  });
});

describe("FR-9 Letter view", () => {
  const html = renderToStaticMarkup(createElement(LetterView, { letter }));

  it("is a read-only article tied to the heading and the AI label", () => {
    expect(html).toContain('aria-labelledby="letter-h2"');
    expect(html).toContain('aria-describedby="letter-ai-label"');
    expect(html).toMatch(/<article/);
    expect(html).not.toMatch(/<textarea|contenteditable|<input/i);
  });

  it("shows the AI label above the Letter", () => {
    expect(html.indexOf('id="letter-ai-label"')).toBeLessThan(
      html.indexOf("<article"),
    );
    expect(text(html)).toContain(
      "Utkast skrevet med KI – les gjennom og tilpass før du sender.",
    );
  });

  it("renders the sign-off as «[Navnet ditt]» and never the token", () => {
    expect(html).toContain("[Navnet ditt]");
    expect(html).not.toContain("SIGNATUR");
    expect(html).toContain("Vennlig hilsen\n[Navnet ditt]");
  });
});

describe("UX-DR30 Letter section", () => {
  const render = (phase: Parameters<typeof LetterSection>[0]["phase"]) =>
    renderToStaticMarkup(
      createElement(LetterSection, { phase, onRetry: () => {} }),
    );

  it("while pending shows the progress line, the real h2, «Skrives» and aria-busy", () => {
    const html = render({ kind: "pending" });
    expect(text(html)).toContain(
      "Skriver søknadsbrevet … dette tar under ett minutt.",
    );
    expect(html).toMatch(/<h2[^>]*id="letter-h2"[^>]*>Søknadsbrev<\/h2>/);
    expect(html).toContain("Skrives");
    expect(html).toContain('aria-busy="true"');
  });

  it("once done shows the Letter under the same heading, without progress or busy", () => {
    const html = render({ kind: "done", letter });
    expect(html).toMatch(/<h2[^>]*id="letter-h2"/);
    expect(html).toContain("<article");
    expect(html).not.toContain("aria-busy");
    expect(text(html)).not.toContain("dette tar under ett minutt");
  });

  it("a provider failure is an alert with «Prøv igjen»; the cap and Test mode are notices", () => {
    const failed = render({ kind: "failed", code: "AI_TIMEOUT" });
    expect(failed).toContain('role="alert"');
    expect(text(failed)).toContain(
      "Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.",
    );
    expect(text(failed)).toContain("Prøv igjen");

    const cap = render({ kind: "failed", code: "DAILY_CAP_REACHED" });
    expect(text(cap)).toContain("Dagens grense");
    expect(cap).not.toContain("role=");
    expect(text(cap)).not.toContain("Prøv igjen");

    const testMode = render({ kind: "failed", code: "TEST_MODE_UNAVAILABLE" });
    expect(text(testMode)).toContain(messages.letter.testMode.text);
    expect(text(testMode)).not.toContain("Prøv igjen");
  });
});

describe("NFR-2 phase-2 line", () => {
  it("says nothing while pending and one sentence when settled", () => {
    expect(letterLine({ kind: "pending" })).toBeNull();
    expect(letterLine({ kind: "done", letter })).toBe(
      "Søknadsbrevet er klart.",
    );
    expect(letterLine({ kind: "failed", code: "AI_TIMEOUT" })).toBe(
      "Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );
    expect(letterLine({ kind: "failed", code: "DAILY_CAP_REACHED" })).toBe(
      "Dagens grense for KI er nådd. Samsvaret står fortsatt.",
    );
    expect(letterLine({ kind: "failed", code: "TEST_MODE_UNAVAILABLE" })).toBe(
      "Søknadsbrevet er ikke tilgjengelig i testmodus.",
    );
  });
});
