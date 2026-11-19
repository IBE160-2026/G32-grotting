import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPlaceholder } from "./ai-placeholder";
import { Notice } from "./notice";
import { ProgressLine } from "./progress-line";

describe("UX-DR30 progress line", () => {
  const html = renderToStaticMarkup(
    createElement(ProgressLine, null, "Skriver søknadsbrevet …"),
  );

  it("is plain text: no role and no live region", () => {
    expect(html).toContain("Skriver søknadsbrevet …");
    expect(html).not.toMatch(/role=|aria-live/);
  });

  it("hides its trace from assistive technology", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("progress-trace");
  });

  it("animates five one-second runs at most and only when motion is allowed", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule =
      /@media \(prefers-reduced-motion: no-preference\) \{\s*\.progress-trace \{\s*animation: progress-trace (\d+(?:\.\d+)?)s [a-z-]+ (\d+) forwards;/.exec(
        css,
      );
    expect(rule).not.toBeNull();
    const seconds = Number(rule?.[1]) * Number(rule?.[2]);
    expect(seconds).toBeLessThanOrEqual(5);
  });
});

describe("UX-DR30 AI placeholder", () => {
  const html = renderToStaticMarkup(
    createElement(AiPlaceholder, { title: "Søknadsbrev", headingId: "h" }),
  );

  it("has its real h2, a «Skrives» strip and aria-busy", () => {
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-labelledby="h"');
    expect(html).toMatch(/<h2[^>]*id="h"[^>]*>Søknadsbrev<\/h2>/);
    expect(html).toContain("Skrives");
    expect(html).toContain("Kommer om under ett minutt.");
  });
});

describe("UX-DR15 notice", () => {
  it("carries a label and is never an alert", () => {
    const html = renderToStaticMarkup(
      // biome-ignore lint/correctness/noChildrenProp: the typed props need children
      createElement(Notice, { label: "Dagens grense", children: "Tekst" }),
    );
    expect(html).toContain("Dagens grense");
    expect(html).toContain("Tekst");
    expect(html).not.toContain("role=");
  });
});
