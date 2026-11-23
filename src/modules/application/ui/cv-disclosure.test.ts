import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CvDisclosure, NoCvNotice, savedDate } from "./cv-disclosure";

const text = (html: string) => html.replace(/<[^>]*>/g, "");
const CV = "Erfaring som regnskapsfører. ".repeat(10);

describe("Story 6.6 savedDate", () => {
  it("formats an ISO instant like the result date", () => {
    expect(savedDate("2026-11-17T12:00:00.000Z")).toBe("17. nov. 2026");
  });

  it("is null for no date or a value that is not one", () => {
    expect(savedDate(null)).toBeNull();
    expect(savedDate("not a date")).toBeNull();
  });
});

describe("Story 6.6 CvDisclosure from the Profile", () => {
  const html = renderToStaticMarkup(
    createElement(CvDisclosure, {
      source: "profile",
      text: CV,
      savedAt: "2026-11-17T12:00:00.000Z",
    }),
  );

  it("is a closed native details with the summary, the count and the date", () => {
    expect(html).toMatch(/^<details/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(text(html)).toContain("CV-tekst fra Profil");
    expect(text(html)).toContain("290 tegn · 17. nov. 2026");
  });

  it("holds the text read-only under an accessible name, with the link to Profil", () => {
    expect(html).toMatch(/<textarea[^>]*readOnly=""/);
    expect(html).toContain('aria-label="CV-tekst, bare lesing"');
    expect(html).toContain('<a class="');
    expect(html).toMatch(/href="\/profil"[^>]*>Du endrer den i Profil<\/a>/);
    expect(text(html)).toContain("Teksten hentes fra Profil.");
  });

  it("offers no editor, picker or confirmation", () => {
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("Bekreft CV-teksten");
  });

  it("leaves the date out when none was kept", () => {
    const none = renderToStaticMarkup(
      createElement(CvDisclosure, { source: "profile", text: CV }),
    );
    expect(text(none)).toContain("290 tegn");
    expect(text(none)).not.toContain("·");
  });
});

describe("Story 6.6 CvDisclosure from the example", () => {
  const html = renderToStaticMarkup(
    createElement(CvDisclosure, { source: "example", text: CV }),
  );

  it("is titled for the example, says the Profile is unchanged and has no link", () => {
    expect(text(html)).toContain("CV-tekst fra eksempelet");
    expect(text(html)).not.toContain("CV-tekst fra Profil");
    expect(text(html)).toContain(
      "Bare til denne søknaden. Profilen din er ikke endret.",
    );
    expect(html).not.toContain("/profil");
  });
});

describe("Story 6.6 NoCvNotice", () => {
  const html = renderToStaticMarkup(createElement(NoCvNotice));

  it("says there is no CV and links to Profil", () => {
    expect(text(html)).toContain("Du har ikke lagt inn CV-en din ennå.");
    expect(html).toMatch(/href="\/profil"[^>]*>Gå til Profil<\/a>/);
    expect(html).not.toContain('role="alert"');
  });
});
