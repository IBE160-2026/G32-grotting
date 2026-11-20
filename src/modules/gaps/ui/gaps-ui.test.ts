import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Gap } from "../contracts";
import { GapEntry, gapTargetId } from "./gap-entry";
import { type GapsPhase, GapsSection } from "./gaps-section";

const NO_COPY =
  "Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.";
const HEDGE = "Linjen din dekker trolig dette – vurder å ta det med.";
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

  it("shows explanation, the citation as a quote, and the hedge, never the suggestion", () => {
    const shown = text(entry(rewordable));
    expect(shown).toContain("Annonsen ber om testing. CV-en nevner tester.");
    expect(shown).toContain(`«${rewordable.citation}»`);
    expect(shown).toContain(SOURCE);
    expect(shown).toContain(HEDGE);
    expect(shown).not.toContain("Skriv om slik og slik.");
    expect(shown).not.toContain(NO_COPY);
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
