import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogueHeading } from "./catalogue-heading";

const html = (props: Parameters<typeof CatalogueHeading>[0]) =>
  renderToStaticMarkup(createElement(CatalogueHeading, props));

describe("CatalogueHeading", () => {
  it("is the text alone without a number or a lead", () => {
    expect(html({ children: "Ny søknad" })).toBe(
      '<h1 class="text-catalogue max-640:text-catalogue-mobile">Ny søknad</h1>',
    );
  });

  it("sets a number in DM Mono, a muted hidden dot and a comma only a screen reader hears", () => {
    const out = html({ number: "JA-002", employer: true, children: "Nordic" });
    expect(out).toContain('<span class="catalogue-number">JA-002</span>');
    expect(out).toContain(
      '<span aria-hidden="true" class="mx-[0.4em] text-mute">·</span>',
    );
    expect(out).toContain('<span class="sr-only">, </span>Nordic');
    expect(out).toContain("max-640:text-catalogue-employer-mobile");
  });

  it("dims the number for the form", () => {
    expect(
      html({ number: "JA-003", dim: true, children: "Ny søknad" }),
    ).toContain('<span class="catalogue-number text-ink-2">JA-003</span>');
  });

  it("keeps the Profil lead as it was", () => {
    const out = html({ lead: "CV", children: "Kari" });
    expect(out).toContain("<span>CV</span>");
    expect(out).not.toContain("catalogue-number");
  });
});
