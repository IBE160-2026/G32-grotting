import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Gap } from "../contracts";
import { GapEntry, gapTargetId } from "./gap-entry";
import { type GapsPhase, GapsSection } from "./gaps-section";

const NO_COPY =
  "Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.";
const HEDGE = "Linjen din dekker trolig dette – vurder å ta det med.";
const HEADING = "Omformuleringsforslag";
const NONE =
  "Ingen forslag her. Vurder selv om og hvordan du vil formulere det.";
const SOURCE = "Sitert ordrett fra CV-en din · sjekket mot CV-teksten";

const rewordable: Gap = {
  keyword: "testing",
  kind: "rewordable",
  explanation: { text: "Annonsen ber om testing. CV-en nevner tester." },
  citation: "Jeg skrev enkle tester for skjemaene våre.",
  suggestion: "Skriv om slik og slik.",
};
const real: Gap = {
  keyword: "TypeScript",
  kind: "real",
  explanation: { text: "Annonsen ber om TypeScript." },
  citation: null,
  suggestion: null,
};
const downgraded: Gap = {
  keyword: "REST-API",
  kind: "real",
  explanation: { key: "REAL_GAP", params: { keyword: "REST-API" } },
  citation: null,
  suggestion: null,
};

const entry = (gap: Gap, index = 0) =>
  renderToStaticMarkup(createElement(GapEntry, { gap, index }));
const section = (phase: GapsPhase) =>
  renderToStaticMarkup(
    createElement(GapsSection, { phase, onRetry: () => {} }),
  );
const text = (html: string) => html.replace(/<[^>]*>/g, "");

describe("FR-13 a Gap on Søknad", () => {
  it("makes the h3 a focus target with the amber strip for a Rewordable gap", () => {
    const html = entry(rewordable, 2);
    expect(html).toContain(`<h3 id="${gapTargetId(2)}" tabindex="-1"`);
    expect(gapTargetId(2)).toBe("gap-2");
    expect(html).toContain("bg-amber");
    expect(text(html)).toContain("Omformulerbart gap");
  });

  it("shows explanation, the citation as a quote, and the hedge", () => {
    const shown = text(entry(rewordable));
    expect(shown).toContain("Annonsen ber om testing. CV-en nevner tester.");
    expect(shown).toContain(`«${rewordable.citation}»`);
    expect(shown).toContain(SOURCE);
    expect(shown).toContain(HEDGE);
    expect(shown).not.toContain(NO_COPY);
  });

  it("FR-16 with rewording off and no suggestion shows neither a box nor the no-suggestion line", () => {
    const shown = text(entry({ ...rewordable, suggestion: null }));
    expect(shown).not.toContain(HEADING);
    expect(shown).not.toContain(NONE);
    expect(shown).toContain(HEDGE);
  });

  it("shows explanation and the no-copy note for a Real gap, nothing to copy", () => {
    const html = entry(real);
    expect(html).toContain("bg-rust");
    const shown = text(html);
    expect(shown).toContain("Reelt gap");
    expect(shown).toContain("Annonsen ber om TypeScript.");
    expect(shown).toContain(NO_COPY);
    expect(html).not.toContain("<blockquote");
    expect(shown).not.toContain(HEDGE);
  });

  it("shows only the template line for a downgraded or skipped Gap", () => {
    const shown = text(entry(downgraded));
    expect(shown).toContain(
      "Annonsen ber om «REST-API». CV-en din viser ikke dette, og vi fant ingen linje i den som dekker det.",
    );
    expect(shown).not.toContain(NO_COPY);
    expect(shown).not.toContain(SOURCE);
  });

  it("shows a Rewordable gap without a citation as the template-only Real gap", () => {
    const html = entry({ ...rewordable, citation: null });
    expect(html).toContain("bg-rust");
    expect(text(html)).toContain("Reelt gap");
    expect(text(html)).not.toContain(HEDGE);
    expect(text(html)).toContain("Annonsen ber om «testing».");
  });
});

describe("FR-13 the Gapanalyse section", () => {
  it("is a placeholder with its real h2 and aria-busy while pending", () => {
    const html = section({ kind: "pending" });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('id="gaps-h2"');
    expect(text(html)).toContain("Gapanalyse");
    expect(text(html)).not.toContain("Skrevet med KI");
  });

  it("carries the sand «Skrevet med KI» strip beside the h2 once settled", () => {
    const html = section({ kind: "done", gaps: [real, rewordable] });
    expect(html).not.toContain("aria-busy");
    expect(html).toContain("bg-sand");
    expect(text(html)).toContain("Skrevet med KI");
    expect(html.match(/<h3 /g)).toHaveLength(2);
  });

  it("shows the alert and «Prøv igjen» for a failure", () => {
    const html = section({ kind: "failed", code: "AI_TIMEOUT" });
    expect(text(html)).toContain(
      "Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.",
    );
    expect(text(html)).toContain("Prøv igjen");
  });

  it("shows the notices for the cap and Test mode, with no retry", () => {
    const cap = section({ kind: "failed", code: "DAILY_CAP_REACHED" });
    expect(text(cap)).toContain("Dagens grense");
    expect(text(cap)).not.toContain("Prøv igjen");
    const test = section({ kind: "failed", code: "TEST_MODE_UNAVAILABLE" });
    expect(text(test)).toContain("Testmodus");
    expect(text(test)).not.toContain("Prøv igjen");
  });
});

describe("FR-16 the suggestion box (Story 5.3)", () => {
  const withBox = (gap: Gap) =>
    renderToStaticMarkup(
      createElement(GapEntry, { gap, index: 0, rewording: true }),
    );

  it("comes after the citation, with the suggestion, a small «Kopier» and then the hedge", () => {
    const html = withBox(rewordable);
    const shown = text(html);
    const order = [
      "Sitert ordrett fra CV-en din",
      HEADING,
      "Skriv om slik og slik.",
      "Kopier",
      HEDGE,
    ].map((part) => shown.indexOf(part));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // A raised box under an h4, below the Gap's h3.
    expect(html).toContain("bg-lift");
    expect(html).toMatch(/<h4[^>]*>Omformuleringsforslag<\/h4>/);
    expect(shown).not.toContain(NONE);
  });

  it("has one small «Kopier» with an accessible name for this Gap, and no add-to-CV action", () => {
    const html = withBox(rewordable);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Kopier forslaget for «testing»"');
    expect(text(html)).not.toMatch(/legg til|CV-en min/i);
  });

  it("shows the suggestion as given, not shortened or changed", () => {
    const long = "Kompetanse i testing, skrevet i arbeidsgiverens ord.";
    expect(text(withBox({ ...rewordable, suggestion: long }))).toContain(long);
  });

  it("replaces the box with the no-suggestion line when the suggestion was discarded, and keeps the citation", () => {
    const html = withBox({ ...rewordable, suggestion: null });
    const shown = text(html);
    expect(shown).toContain(NONE);
    expect(shown).not.toContain(HEADING);
    expect(html).not.toContain("<button");
    expect(shown).toContain(`«${rewordable.citation}»`);
    expect(shown).toContain(HEDGE);
  });

  it("shows no box for a suggestion string when the flag is off (the server sends none then)", () => {
    const shown = text(entry(rewordable));
    expect(shown).not.toContain(HEADING);
    expect(shown).not.toContain("Skriv om slik og slik.");
    expect(shown).toContain(HEDGE);
  });

  it("gives a Real gap no box and no line", () => {
    const shown = text(withBox(real));
    expect(shown).not.toContain(HEADING);
    expect(shown).not.toContain(NONE);
    expect(shown).toContain(NO_COPY);
  });

  it("gives a Rewordable gap without a citation the template line only", () => {
    const shown = text(withBox({ ...rewordable, citation: null }));
    expect(shown).not.toContain(HEADING);
    expect(shown).not.toContain(NONE);
  });

  it("passes the flag from the section down to each entry", () => {
    const phase: GapsPhase = {
      kind: "done",
      gaps: [{ ...rewordable, suggestion: null }],
    };
    const html = renderToStaticMarkup(
      createElement(GapsSection, { phase, onRetry: () => {}, rewording: true }),
    );
    expect(text(html)).toContain(NONE);
    expect(text(section(phase))).not.toContain(NONE);
  });
});
