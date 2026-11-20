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

function render(regen: "idle" | "running" | "failed") {
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
    expect(html).toContain('role="alert"');
    expect(text(html)).toContain(
      "Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.",
    );
    expect(text(html)).toContain("Prøv igjen");
  });
});
