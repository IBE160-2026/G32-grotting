import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyButton } from "./copy-button";

const text = (html: string) => html.replace(/<[^>]*>/g, "");

describe("UX-DR13 copy button", () => {
  it("is a button with the label «Kopier» and a hidden icon, secondary by default", () => {
    const html = renderToStaticMarkup(createElement(CopyButton, { text: "x" }));
    expect(html).toMatch(/^<button/);
    expect(text(html)).toBe("Kopier");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("border-edge");
    expect(html).not.toContain("aria-label");
  });

  it("is primary where the owner asks (the Letter)", () => {
    const html = renderToStaticMarkup(
      createElement(CopyButton, { text: "x", variant: "primary" }),
    );
    expect(html).toContain("bg-ink");
  });

  it("takes an entry-specific accessible name (Historikk)", () => {
    const html = renderToStaticMarkup(
      createElement(CopyButton, {
        text: "x",
        ariaLabel: "Kopier brevet til JA-002",
      }),
    );
    expect(html).toContain('aria-label="Kopier brevet til JA-002"');
  });
});
