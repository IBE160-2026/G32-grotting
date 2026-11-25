import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Letter } from "../contracts";
import { LetterSection } from "./index";

const letter: Letter = {
  text: "Hei Nordic Digital,\n\nJeg søker.\n\n{{SIGNATUR}}",
  tone: "Direkte",
  rev: 2,
};
const text = (html: string) => html.replace(/<[^>]*>/g, "");

function render(regen: "idle" | "running" | "failed" | "cap" | "testMode") {
  return renderToStaticMarkup(
    createElement(LetterSection, {
      phase: { kind: "done", letter },
      onRetry: () => {},
      employer: "Nordic Digital",
      regen,
      onRegenerate: () => {},
    }),
  );
}

describe("FR-12, UX-DR28 the action stack under the Letter", () => {
  const html = render("idle");

  it("holds «Kopier» (primary), «Last ned (.docx)» and «Lag nytt utkast», in that order", () => {
    const buttons = (html.match(/<button[\s\S]*?<\/button>/g) ?? []).map(text);
    expect(buttons).toEqual(["Kopier", "Last ned (.docx)", "Lag nytt utkast"]);
    expect(html.indexOf("bg-ink")).toBeLessThan(html.indexOf("Last ned"));
  });

  it("is under the Letter, with the hint, and full width at 640 px or less", () => {
    expect(html.indexOf("</article>")).toBeLessThan(html.indexOf("Kopier"));
    expect(text(html)).toContain(
      "«Lag nytt utkast» skriver et nytt brev i samme tone.",
    );
    expect(html).toContain("max-640:items-stretch");
  });

  it("shows no progress line and no alert while idle", () => {
    expect(text(html)).not.toContain("Skriver et nytt utkast");
    expect(html).not.toContain("role=");
    expect(html).not.toContain("aria-busy");
  });
});

describe("UX-DR39 Letter regenerating", () => {
  it("keeps the old Letter, shows the progress line and makes the button busy", () => {
    const html = render("running");
    expect(html).toContain("<article");
    expect(text(html)).toContain("Skriver et nytt utkast …");
    expect(text(html)).toContain("Jeg søker.");
    const busy =
      html.match(/<button[^>]*aria-disabled="true"[^>]*>[\s\S]*?<\/button>/g) ??
      [];
    expect(busy.map(text)).toEqual(["Lag nytt utkast"]);
  });

  it("on failure keeps the old Letter with an alert and «Prøv igjen»", () => {
    const html = render("failed");
    expect(html).toContain("<article");
    // Silent: the second live region speaks it once.
    expect(html).not.toContain('role="alert"');
    expect(text(html)).toContain(
      "Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.",
    );
    expect(text(html)).toContain("Prøv igjen");
  });

  it("NFR-5, FR-25 the cap is the «Dagens grense» notice with no retry, and the old Letter stays", () => {
    const html = render("cap");
    expect(html).toContain("<article");
    expect(text(html)).toContain("Dagens grense");
    expect(text(html)).toContain(
      "Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.",
    );
    expect(text(html)).not.toContain("Prøv igjen");
    expect(html).not.toContain("role=");
  });

  it("FR-27 Test mode is the «Testmodus» notice with no retry, and the old Letter stays", () => {
    const html = render("testMode");
    expect(html).toContain("<article");
    expect(text(html)).toContain("Testmodus");
    expect(text(html)).toContain("Ikke tilgjengelig i testmodus.");
    expect(text(html)).not.toContain("Prøv igjen");
  });
});

describe("Story 6.9 the action stack of a reopened Letter", () => {
  const renderReadOnly = (
    regen: "idle" | "running" | "failed" | "cap" | "testMode" = "idle",
  ) =>
    renderToStaticMarkup(
      createElement(LetterSection, {
        readOnly: true,
        phase: { kind: "done", letter },
        employer: "Nordic Digital",
        regen,
        year: 2025,
      }),
    );

  it("holds «Kopier» and «Last ned (.docx)» only, with no «Lag nytt utkast»", () => {
    const html = renderReadOnly();
    const buttons = (html.match(/<button[\s\S]*?<\/button>/g) ?? []).map(text);
    expect(buttons).toEqual(["Kopier", "Last ned (.docx)"]);
    expect(html).not.toContain("Lag nytt utkast");
    expect(html).not.toContain("Skriver et nytt utkast");
    expect(text(html)).not.toContain("«Lag nytt utkast»");
  });

  it("shows no regenerate alert, notice or progress whatever the regen state is", () => {
    for (const regen of ["running", "failed", "cap", "testMode"] as const) {
      const html = renderReadOnly(regen);
      expect(html).not.toContain("Prøv igjen");
      expect(html).not.toContain("Dagens grense");
      expect(html).not.toContain("Testmodus");
      expect(html).not.toContain("Skriver et nytt utkast");
      expect(html).not.toContain("role=");
    }
  });

  it("leaves the fresh Letter as it was: «Lag nytt utkast» and the old hint", () => {
    const html = render("idle");
    expect(html).toContain("Lag nytt utkast");
    expect(text(html)).toContain("«Lag nytt utkast» skriver et nytt brev");
  });
});
